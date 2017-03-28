import Raku from 'raku'

const raku = new Raku()

class RakuOrm {

	/* ### Documentation of Private variables and how they're managed
				 on disk. ###

		# "Child" is the class that inherits from RakuOrm, e.g. User or Post

		- Child.schema e.g. { first_name: 'String', habtm: [{...}]}
		- Child.props e.g. ['email', 'id']
		- Child.prop_types e.g. { email: 'String'}
		- Child.observed_keys e.g. Post.observed_keys = { User: ['posts_ids', 'favorite_post_id'] }

		# 'child' is an instance of Child, e.g. user

		- child.dirty Object { [prop]: Boolean }, true if it's been changed.
		- child._[prop] = where the value of the property value is stored.

		# "habtm edges" are doubly indexed. If model A habtm model B, and a_i has many b_k, where a_i are instances of A and b_k are instances of B, and k element of K, a set, then K is stored as an attribute of a_i.  Also, consider a particular b_k and all a_j where j is an element of J, the set of all indices that habtm b_k, then J is stored as an attribute of b_k as "backlinks" to A. By convention, if the habtm method is called "x" then the set of ids are stored in "x_ids".  If the method "x" is plural, it is not singularized.  So for example, if the relationship is "authors", the ids will be stored in "authors_ids".

		- On disk, back links to the foreign keys should be doubly indexed:
			 E.g. If User has many Posts, and User#234 and User#500 own post #42,

						Post#42:User:posts_ids -> [234, 500]

				 means that 42 is also contained in User#234:posts_ids and
					 User#500:posts_ids.

         However, if in the Posts model, there is an habtm relationship 'authors' which is the inverse of 'posts', then the backlink key will be Post#42:authors_ids.

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

  // Map property names to and property types.
	static track(klass, attr, type) {
		if (klass.props == undefined) { klass.props = [] }
		if (klass.prop_types == undefined) { klass.prop_types = {} }
		klass.props.push(attr)
		klass.prop_types[attr] = type
	}

  // Map class names (as strings) to actuall class objects.
	static storeClass(klass) {
		if (this.classes == undefined) { this.classes = {} }
		this.classes[klass.name] = klass
	}

	static getClass(klass_string) {
		return this.classes[klass_string]
	}

  // Map the attributes that depend on the current instance, so that the foreign attributes
  //  can be updated upon deletion of the current instance.
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

  // Map relationships to their inverses.
  static store_inverse_of(klass_name, method_name, klass_name_inverse, method_name_inverse) {
    if (RakuOrm._inverse == undefined) { this._inverse = {} }
    if (RakuOrm._inverse[klass_name] == undefined) { this._inverse[klass_name] = {} }
    if (RakuOrm._inverse[klass_name][method_name] == undefined) { this._inverse[klass_name][method_name] = {} }
    if (RakuOrm._inverse[klass_name_inverse] == undefined) { this._inverse[klass_name_inverse] = {} }
    if (RakuOrm._inverse[klass_name_inverse][method_name_inverse] == undefined) { this._inverse[klass_name_inverse][method_name_inverse] = {} }
    RakuOrm._inverse[klass_name][method_name] = {model: klass_name_inverse, method: method_name_inverse}
    RakuOrm._inverse[klass_name_inverse][method_name_inverse] = {model: klass_name, method: method_name}
  }

  static inverse_of(klass_name, method_name) {
    if (RakuOrm._inverse == undefined) { return undefined}
    if (RakuOrm._inverse[klass_name] == undefined) { return undefined }
    return RakuOrm._inverse[klass_name][method_name]
  }

	// Create getter and setter functions from the schema, and create auxilliar maps to track
  //  depencies between classes.
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
			} else if (key == 'habtm') {
				if (klass.observed_keys == undefined) { klass.observed_keys = {} }
				let relationships = schema[key]
				if (Array.isArray(relationships)) {
					relationships.forEach(obj => {
						// A habtm B
						obj.A = klass.name
						obj.B = obj.model
						let ids_attr = obj.method + '_ids'
						let type = 'Habtm'
						this.track(klass, ids_attr, type)

            // Do this in the next tick, so that RakuOrm knows about the other classes.
						process.nextTick(() => this.getClass(obj.model).observe(klass, ids_attr))
            if (obj.inverse_of) { RakuOrm.store_inverse_of(obj.A, obj.method, obj.B, obj.inverse_of) }
						Object.defineProperty(klass.prototype, ids_attr,
							 {
								 get: function() {
										return this.raw_get.call(this, ids_attr)
									},
								 set: function(x) {
									this.dirty[ids_attr] = x
									this.raw_set.call(this, ids_attr, x)
								 }
							 }
						 ) // Object.defineProperty

             // Define the habtm method for loading e.g. user.posts()
						 klass.prototype[obj.method] = function(...load_args) {
              let N = 10, OFFSET = 0
              let attr_args = load_args
              if (typeof load_args[load_args.length - 1] == 'number') {
                if (typeof load_args[load_args.length - 2] == 'number') {
									N = load_args[load_args.length - 2]
									OFFSET = load_args[load_args.length - 1]
									attr_args = load_args.slice(0, load_args.length - 2)
                } else {
									N = load_args[load_args.length - 1]
									attr_args = load_args.slice(0, load_args.length - 1)
                }
              }
							let model = RakuOrm.name2model(obj.model)
							return this.load(ids_attr)
                .then(reloaded => {
                  let other_ids = reloaded.get(ids_attr) || []
                  other_ids = other_ids.slice(OFFSET, OFFSET + N)
							    return Promise.all(other_ids.map(id => (new model(id)).load(...attr_args)))
                })
						 }
					})
				}
			} // else if
		} // for
	} // init

	hm_attr2model_name(attr) {
		let model = null
		this.constructor.schema.habtm.forEach(hm => {
			if (hm.method + '_ids' == attr) {
				model = hm.model
				return null
			}
		})
		return model
	}

	static name2model(klass_name) {
		return this.classes[klass_name]
	}

	async save_backlink(hm_attr) {
		// For each habtm id, generate the key for the corresponding belongs_to instance.
		let current_ids = new Set(this.raw_get.call(this, hm_attr))
    let disk_ids = new Set((await this.load(hm_attr)).get(hm_attr))
    let delete_ids = new Set([...disk_ids].filter(x => !current_ids.has(x)))
    let append_ids = new Set([...current_ids].filter(x => !disk_ids.has(x)))
    console.log('previous_ids', disk_ids, current_ids, 'delete these', delete_ids.keys(), 'add these', append_ids)

		// We're using Riak CRDT sets via raku/no-riak to store back links.
		let save_backlinks = []
		let model = RakuOrm.name2model(this.hm_attr2model_name(hm_attr))
    for(const model_id of delete_ids) {
			const m = new model(model_id)
			const backlink_key = m.habtm_backlink_key(this.constructor.name, hm_attr)
			save_backlinks.push(raku.srem(backlink_key, this.id))
    }
		for(const model_id of append_ids) {
			const m = new model(model_id)
			const backlink_key = m.habtm_backlink_key(this.constructor.name, hm_attr)
			save_backlinks.push(raku.sadd(backlink_key, this.id))
		}
		return Promise.all(save_backlinks)
	}

	save_prop(attr) {
		let type = this.constructor.prop_types[attr]
		let k = this.attr_key(attr)
		let put_fun = this.constructor.set_fun[type]
		let value = this.raw_get.call(this, attr)
		let promise 
		if (type == 'Habtm') {
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
						if ('Habtm' == that.constructor.prop_types[attr]) {
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
				key = this.habtm_backlink_key(model_A_name, model_A_attr)
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

	habtm_backlink_key(klass, key) {
    const method = key.replace(/_ids$/, '')
    const inverse = RakuOrm.inverse_of(klass, method)
    const backlink_key = inverse ? this.attr_key(inverse.method + '_ids') : this.instance_name() + ':' + klass + ':' + key
		return backlink_key
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
	'Habtm': raku.smembers
}

RakuOrm.set_fun = {
	'ID': raku.cset,
	'String': raku.set,
	'Integer': raku.cset,
	'Habtm': raku.sadd
}

RakuOrm.del_fun = {
	'ID': raku.cdel,
	'String': raku.del,
	'Integer': raku.cdel,
	'Habtm': raku.sdel
}

RakuOrm.initial_value = {
	'ID': null,
	'String': null,
	'Integer': 0,
	'Habtm': []
}

export default RakuOrm
