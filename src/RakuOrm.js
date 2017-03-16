import Raku from 'raku'

const raku = new Raku()

class RakuOrm {

	/* ### Documentation of Private variables and how they're managed
				 on disk. ###

		# "Child" is the class that inherits from RakuOrm, e.g. User or Post

		- Child.schema e.g. { first_name: 'String', has_many: [{...}]}
		- Child.props e.g. ['email', 'id']
		- Child.prop_types e.g. { email: 'String'}
		- Child.observed_keys e.g. Post.observed_keys = { User: ['post_ids', 'favorite_post_id'] }

		# 'child' is an instance of Child, e.g. user

		- child.dirty Object { [prop]: Boolean }, true if it's been changed.
		- child._[prop] = where the value of the property value is stored.

		# "has_many edges" are stored in two places.

		- On disk, back links to the foreign keys should be doubly indexed:
			 E.g. If User has many Posts, and User#234 and User#500 own post #42,

						Post#42:User:post_ids -> [234, 500]

				 means that 42 is also contained in User#234:post_ids and
					 User#500:post_ids.

			You need to update both the forward link and the back link upon
				create, update, and delete.
	*/

	constructor(id) {
		// Keep a list of modified properties here.
		this.dirty = {}
		let that = this
		this.constructor.props && this.constructor.props.forEach(attr => {
			let type = that.constructor.prop_types[attr]
			that.set(attr, that.constructor.initial_value[type])
		})
		if (id != undefined) this.id = id
	}

	// Call a setter bypassing custom hooks.
	raw_set(k, v) {
		this['_' + k] = v
		return v
	}

	// Call a setter bypassing custom hooks.
	raw_get(k) {
		return this['_' + k]
	}

	// Call a dynamic property setter.	e.g. this.email=
	//	This invokes custom hooks as well.
	set(k, v) {
		Object.getOwnPropertyDescriptor(this.constructor.prototype, k).set.call(this, v)
		return v
	}

	// Call a dynamic property setter.	e.g. this.email
	//	This invokes custom hooks as well.
	get(k) {
		return Object.getOwnPropertyDescriptor(this.constructor.prototype, k).get.call(this)
	}

  static lastId() {
    return raku.cget(this.last_id_key())
  }

	static track(klass, attr, type) {
		if (klass.props == undefined) { klass.props = [] }
		if (klass.prop_types == undefined) { klass.prop_types = {} }
		klass.props.push(attr)
		klass.prop_types[attr] = type
	}

	static storeClass(klass) {
		if (this.classes == undefined) { this.classes = {} }
		this.classes[klass.name] = klass
	}

	static getClass(klass_string) {
		return this.classes[klass_string]
	}

	static observe(klass, foreign_key) {
		if (this._observed_keys == undefined) { this._observed_keys = {} }
		if (this._observed_keys[klass.name] == undefined) {
			this._observed_keys[klass.name] = new Set()
		}
		if (!this._observed_keys[klass.name].has(foreign_key)) {
			this._observed_keys[klass.name].add(foreign_key)
		}
	}

	static observed_models() {
		return this._observed_keys == undefined ? [] : Object.keys(this._observed_keys)
	}

	static observed_keys(klass_name) {
		let  res = klass_name == undefined ? this._observed_keys : this._observed_keys[klass_name]
		return res == undefined ? [] : res
	}

	// Create getter and setter functions from the schema.
	static init(klass) {
		if (klass.props == undefined) { klass.props = [] }
		if (klass.prop_types == undefined) { klass.prop_types = {} }
		RakuOrm.storeClass(klass)
		let schema = klass.schema
		schema.id = 'ID'
		for (let key of Object.keys(schema)) {
			let type = schema[key]
			if (['String', 'Integer', 'ID'].includes(type)) {
				// Keep track of class attributes.
				let attr = key
				this.track(klass, attr, type)

				// Define a regular attribute getter and setter, so that we can
				//	hook into it to track 'dirty' properties that need to be
				//	saved in the database.
				Object.defineProperty(klass.prototype, attr,
					{
						get: function() {
								return this.raw_get.call(this, attr)
							},
						set: function(x) {
							this.dirty[attr] = true
							this.raw_set.call(this, attr, x)
						}
					}
				)
			} else if (key == 'has_many') {
				if (klass.observed_keys == undefined) { klass.observed_keys = {} }
				let relationships = schema[key]
				if (Array.isArray(relationships)) {
						relationships.forEach(obj => {
						// A has_many B
						obj.A = klass.name
						obj.B = obj.model
						let attr = obj.key
						let type = 'HasMany'
						this.track(klass, attr, type)
            // Do this in the next tick, so that RakuOrm knows about the other classes.
						process.nextTick(() => this.getClass(obj.model).observe(klass, attr))
						Object.defineProperty(klass.prototype, attr,
							 {
								 get: function() {
										return this.raw_get.call(this, attr)
									},
								 set: function(x) {
									this.dirty[attr] = x
									this.raw_set.call(this, attr, x)
								 }
							 }
						 ) // Object.defineProperty

             // Define the has_many method for loading e.g. user.posts()
						 klass.prototype[obj.method] = function(...args) {
              let N = 10, OFFSET = 0
              let attr_args = args
              if (typeof args[args.length - 1] == 'number') {
                if (typeof args[args.length - 2] == 'number') {
									N = args[args.length - 2]
									OFFSET = args[args.length - 1]
									attr_args = args.slice(0, args.length - 2)
                } else {
									N = args[args.length - 1]
									attr_args = args.slice(0, args.length - 1)
                }
              }
							let model = RakuOrm.name2model(obj.model)
							let fks = this.raw_get(attr) || []
              fks = fks.slice(OFFSET, OFFSET + N)
							return Promise.all(fks.map(id => (new model(id)).load(...attr_args)))
						 }
					})
				}
			} // else if
		} // for
	} // init

	hm_attr2model_name(attr) {
		let model = null
		this.constructor.schema.has_many.forEach(hm => {
			if (hm.key == attr) {
				model = hm.model
				return null
			}
		})
		return model
	}

	static name2model(klass_name) {
		return this.classes[klass_name]
	}

	save_backlink(hm_attr) {
		// For each has_many id, generate the key for the corresponding belongs_to instance.
		let values = this.raw_get.call(this, hm_attr)
		let model = RakuOrm.name2model(this.hm_attr2model_name(hm_attr))
		let save_backlinks = []
		// We're using Riak CRDT sets via raku/no-riak to store back links.
		values.forEach(model_id => {
			const m = new model
			m.id = model_id
			const backlink_key = m.has_many_backlink_key(this.constructor.name, hm_attr)
			save_backlinks.push(raku.sadd(backlink_key, this.id))
		})
		return Promise.all(save_backlinks)
	}

	save_prop(attr) {
		let type = this.constructor.prop_types[attr]
		let k = this.attr_key(attr)
		let put_fun = this.constructor.set_fun[type]
		let value = this.raw_get.call(this, attr)
		let promise 
		if (type == 'HasMany') {
			promise = this.constructor.del_fun[type].call(raku, k)
				.then(() => put_fun.call(raku, k, ...value))
		} else {
			promise = put_fun.call(raku, k, value)
		}
		return promise
	}

	save() {
    let that = this
		let promise = Promise.resolve(this)
		// If new instance.
		if (this.id == null) {
			promise = promise
				.then(() => raku.cinc(this.constructor.last_id_key()))
				.then(value => {
						this.id = value
						return this
					})
		}

		// Now we have an id for this instance.
		return promise
			.then(() => {
				// Save the dirty keys.
				let dirty_keys = Object.keys(this.dirty)
					.filter(key => key != 'id' && this.dirty[key] != null)
				let promises = dirty_keys.map(attr => {
						let p1 = that.save_prop(attr)
						let p2 = Promise.resolve(this)
						if ('HasMany' == that.constructor.prop_types[attr]) {
							p2 = that.save_backlink(attr)
						}
						return Promise.all([p1, p2])
					})
				return Promise.all(promises)
					.then(() => that)
			})
	}

	static load(id, ...attrs) {
		let instance = new this()
		instance.id = id
		return instance.load(...attrs)
	}

	initialize_props() {
		let that = this
		this.constructor.props.forEach(attr => {
			let type = that.constructor.prop_types[attr]
			that.set(attr, that.constructor.initial_value[type])
		})
	}

	// Remove associations
	remove(attr, fk_id) {
		const key = this.attr_key(attr)
		return raku.srem(key, fk_id)
	}

	delete_props() {
		let that = this
		let delete_promises = []
		let remove_backlinks = []
		let key, model_A, attributes
		this.constructor.observed_models().forEach(model_A_name => {
			model_A = RakuOrm.classes[model_A_name]
			attributes = this.constructor.observed_keys(model_A_name)
			attributes.forEach(model_A_attr => {
				key = this.has_many_backlink_key(model_A_name, model_A_attr)
				let update_model_A = raku.smembers(key)
					.then(model_A_ids => {
						return Promise.all(model_A_ids.map(id => {
								let a = new model_A(id)
								return a.remove(model_A_attr, that.id)
							}))
					})
				delete_promises.push(update_model_A)
				remove_backlinks.push(raku.sdel(key))
			})
		})

		// Delete regular properties on disk.
		this.constructor.props.forEach(attr => {
			let type = that.constructor.prop_types[attr]
			let del_fun = that.constructor.del_fun[type]
			let k = that.attr_key(attr)
			delete_promises.push(del_fun.call(raku, k))
		})

		return Promise.all(delete_promises)
			.then(() => Promise.all(remove_backlinks))
	}

	delete() {
		let that = this
		return this.delete_props() // on disk
			.then(() => that.initialize_props()) // in memory
	}

	static last_id_key() {
		return this.name + ':last_id'
	}

	instance_name() {
		return this.constructor.name + '#' + this.id
	}

	attr_key(prop_name) {
		return this.instance_name() + ':' + prop_name
	}

	has_many_key(klass_name) {
		let idized = klass_name.toLowerCase() + '_ids'
		return this.instance_name() + ':' + idized
	}

	has_many_backlink_key(klass, key) {
		return this.instance_name() + ':' + klass + ':' + key
	}

	load(...attrs) {
    const not_id = s => s != 'id'
    let type, get_fun
		return Promise.all(attrs.filter(not_id).map(attr => {
				type = this.constructor.prop_types[attr]
				get_fun = this.constructor.get_fun[type]
        if (type == undefined) {
          throw '' + attr  + ' is not an attribute'
        }
				return get_fun.call(raku, this.attr_key(attr))
			}))
			.then(values => {
				for (let i in values) {
					this.raw_set(attrs[i], values[i])
				}
				return this
			})
	}

	inc(attr) {
		return raku.cinc(this.attr_key(attr))
	}
}

RakuOrm.get_fun = {
	'ID': raku.cget,
	'String': raku.get,
	'Integer': raku.cget,
	'HasMany': raku.smembers
}

RakuOrm.set_fun = {
	'ID': raku.cset,
	'String': raku.set,
	'Integer': raku.cset,
	'HasMany': raku.sadd
}

RakuOrm.del_fun = {
	'ID': raku.cdel,
	'String': raku.del,
	'Integer': raku.cdel,
	'HasMany': raku.sdel
}

RakuOrm.initial_value = {
	'ID': null,
	'String': null,
	'Integer': 0,
	'HasMany': []
}

export default RakuOrm
