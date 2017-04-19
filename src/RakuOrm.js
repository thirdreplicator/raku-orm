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

    # has_many edges are also doubly indexed, but the backlink is just a regular integer attribute.
	*/

	constructor(id) {
		// Keep a list of modified properties here.
		this.dirty = {}
		let that = this
		this.constructor.props && this.constructor.props.forEach(attr => {
			let type = that.constructor.prop_types[attr]
			that.raw_set(attr, that.constructor.initial_value[type])
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
    RakuOrm.store_prop_type(klass.name, attr, type)
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
  static store_inverse_of(klass_name, method_name, type_name, klass_name_inverse, method_name_inverse, type_name_inverse) {
    if (RakuOrm._inverse == undefined) { this._inverse = {} }
    if (RakuOrm._inverse[klass_name] == undefined) { this._inverse[klass_name] = {} }
    if (RakuOrm._inverse[klass_name][method_name] == undefined) { this._inverse[klass_name][method_name] = {} }
    // Only overwrite it, if it doesn't exist yet.
    if ( RakuOrm.keys().length == 0) {
      if (RakuOrm._inverse[klass_name][method_name].model == undefined) { RakuOrm._inverse[klass_name][method_name].model = klass_name_inverse }
      if (RakuOrm._inverse[klass_name][method_name].method == undefined) { RakuOrm._inverse[klass_name][method_name].method = method_name_inverse }
      if (RakuOrm._inverse[klass_name][method_name].type == undefined) { RakuOrm._inverse[klass_name][method_name].type = type_name_inverse}
    }

    if (typeof method_name != 'undefined') {
			if (RakuOrm._inverse[klass_name_inverse] == undefined) { this._inverse[klass_name_inverse] = {} }
			if (RakuOrm._inverse[klass_name_inverse][method_name_inverse] == undefined) { this._inverse[klass_name_inverse][method_name_inverse] = {} }
      if (RakuOrm._inverse[klass_name_inverse][method_name_inverse].model == undefined) {  RakuOrm._inverse[klass_name_inverse][method_name_inverse].model = klass_name }
      if (RakuOrm._inverse[klass_name_inverse][method_name_inverse].method == undefined) { RakuOrm._inverse[klass_name_inverse][method_name_inverse].method = method_name }
      if (RakuOrm._inverse[klass_name_inverse][method_name_inverse].type == undefined) {   RakuOrm._inverse[klass_name_inverse][method_name_inverse].type = type_name }
		}
  }

  static inverse_of(klass_name, method_name) {
    if (RakuOrm._inverse == undefined) { return undefined}
    if (RakuOrm._inverse[klass_name] == undefined) { return undefined }
		const rel_name = method_name.replace(/_ids?$/, '')  
    return RakuOrm._inverse[klass_name][rel_name]
  }

	static store_prop_type(klass_name, method_name, type_name) {
    if (RakuOrm._prop_type == undefined) { RakuOrm._prop_type = {} }
    if (RakuOrm._prop_type[klass_name] == undefined) { this._prop_type[klass_name] = {} }
    if (RakuOrm._prop_type[klass_name][method_name] == undefined) { this._prop_type[klass_name][method_name] = type_name }
  }

  static prop_type(klass_name, method_name) {
    if (RakuOrm._prop_type == undefined) { return undefined }
    if (RakuOrm._prop_type[klass_name] == undefined ) { return undefined }
    return RakuOrm._prop_type[klass_name][method_name]
  }

  static define_getter_setter(prototype, attr) {
		Object.defineProperty(prototype, attr,
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
  }

  static parse_load_args(load_args) {
    let n = 10, offset = 0
    let attr_args = load_args
    const i_1 = load_args.length - 1
    const i_2 = load_args.length - 2
    const last_arg = load_args[i_1]
    if (typeof last_arg == 'number') {
			const second_to_last_arg = load_args[i_2]
      if (typeof second_to_last_arg == 'number') {
				n = second_to_last_arg
				offset = last_arg
				attr_args = load_args.slice(0, i_2)
      } else {
				n = last_arg
				attr_args = load_args.slice(0, i_1)
      }
    }
    return [n, offset, attr_args]
  } 
  
  static define_load_many(B_model, A_model, rel_name, ids_attr) {
    const load_fn = 'load_' + rel_name
		A_model.prototype[load_fn] = function(...load_args) {
     const [n, offset, attrs] = RakuOrm.parse_load_args(load_args)
     // Reload the foreign ids array in case they changed on disk,
     //  then load the instances corresponding to the foreign ids.
		 return this.load(ids_attr)
       .then(reloaded => {
         let other_ids = reloaded.get(ids_attr) || []
         other_ids = other_ids.slice(offset, offset + n)
		     return Promise.all(other_ids.map(id => (new B_model(id)).load(...attrs)))
       })
		}
  } // static define_load_many

  static define_load_one(model_A, model_B, rel_name) {
    const id_attr = rel_name + '_id'
    const load_fn = 'load_' + rel_name 
		model_A.prototype[load_fn] = function(...attrs) {
      // Reload from disk first, then
      //  return an instance of the B_model with the specified attrs.
      return this.load(id_attr)
        .then(async (reloaded) => {
          let other_id = reloaded.get(id_attr) || null
          if (other_id == null) { return Promise.resolve(null) }
          const b = await new model_B(other_id).load(...attrs)
          this[rel_name] = b
          return b
        })
    }
  } // static delete_belongs_to

  static keys(klass_name, attr, ...ids) {
    return ids.map(id => this.key(klass_name, attr, id))
  }

  static key(klass_name, attr, id) {
    return klass_name + '#' + id + ':' + attr
  }

  static inverse_key(klass_name, attr_name, id) {
    const inverse = RakuOrm.inverse_of(klass_name, attr_name)
    let inverse_attr, type
    if (inverse && inverse.method) {
			type = inverse.type
			inverse_attr = inverse.method + this.id_postfix(type)
    } else {
      inverse_attr = klass_name + ':' + attr_name
    }
		return this.key(inverse.model, inverse_attr, id)
  }

  static inverse_keys(klass_name, attr_name, ...ids) {
    return ids.map(id => this.inverse_key(klass_name, attr_name, id))
  }

  static define_remove_belongs_to(model_A, rel_name) {
    const id_attr = rel_name + '_id'
    const load_fn = 'remove_' + rel_name 
		model_A.prototype[load_fn] = function() {
      const fk = this.raw_get(id_attr)
      if (!fk) { return -1 }
      this.set(id_attr, null)
      const backlink_keys = RakuOrm.inverse_keys(model_A.name, id_attr, ...[fk])
			//const inverse_key = b.belongs_to_backlink_key(model_A.name, rel_name)
      return this.save()
        .then(_ => Promise.all(backlink_keys.map(k => raku.srem(k, fk))))
    }
  } // static define_delete_belongs_to

  static inverse_type(type) {
    if (type == 'habtm') {
      return 'habtm'
    } else if (type == 'has_many') {
      return 'belongs_to'
    } else if (type == 'belongs_to') {
      return 'has_many'
    } else if (type == 'has_one') {
      return 'has_one'
    }
  }

  static id_postfix(type) {
    if (type == 'habtm' || type == 'has_many') { return '_ids' }
    else { return '_id' }
  }

	// Create getter and setter functions from the schema, and create auxilliary maps to track
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

				// Define a regular attribute getter and setters, so that we can
				//	hook into it to track 'dirty' properties that need to be
				//	saved in the database.
        this.define_getter_setter(klass.prototype, attr)
			} else if (key == 'habtm' || key == 'has_many') {
				//if (klass.observed_keys == undefined) { klass.observed_keys = {} }
				const rel_type = key
				let relationships = schema[rel_type]
				if (!Array.isArray(relationships)) { throw klass.name + '.' + rel_type + ' should be an Array' }
				relationships.forEach(rel => {
					// A [has_many||habtm] B
          const model_A = klass
          const model_A_name = model_A.name
          const model_B_name = rel.model
					const ids_attr = rel.method + this.id_postfix(rel_type)

          // Store inverse relationship.
          if (rel.inverse_of) { RakuOrm.store_inverse_of(model_A_name, rel.method, rel_type, model_B_name, rel.inverse_of, this.inverse_type(rel_type)) }

          // Track the meta-data (name and type) of the <RELATIONSHIP>_ids attribute.
					this.track(model_A, ids_attr, rel_type)

          // define <RELATIONSHIP>'_ids getter/setter.
          this.define_getter_setter(model_A.prototype, ids_attr)

          // Define the load-many method for loading e.g. user.posts()
          // It needs to be done after the nextTick to get access to the other model, because
          //   user-defined models can be initialized in any order.  So, we need to wait until
          //   the (class name -> class reference) map to be defined in the next tick.
					process.nextTick(() => {
            this.getClass(model_B_name).observe(model_A, ids_attr)
            const model_B = RakuOrm.name2model(model_B_name)
					  this.define_load_many(model_B, model_A, rel.method, ids_attr)
          })
				})
          
			} else if (key == 'belongs_to') {
				const rel_type = key
				let relationships = schema[rel_type]
				if (!Array.isArray(relationships)) { throw klass.name + '.' + rel_type + ' should be an Array' }
				relationships.forEach(rel => {
          // A belongs_to B
          const model_A = klass
          const model_A_name = model_A.name
          const model_B_name = rel.model
					const id_attr = rel.method + this.id_postfix(rel_type)

          // Track the meta-data (name and type) of the <RELATIONSHIP>_id attribute.
					this.track(model_A, id_attr, rel_type)

          // Store inverse relationship.
          if (rel.inverse_of) { RakuOrm.store_inverse_of(model_A_name, rel.method, this.inverse_type(rel_type), model_B_name, rel.inverse_of, this.inverse_type(rel_type)) }

          // define <RELATIONSHIP>'_id getter/setter.
          this.define_getter_setter(model_A.prototype, id_attr)

          // Track the meta-data (name and type) of the <RELATIONSHIP>_ids attribute.
					this.track(model_A, rel.method, 'Integer')

          // define <RELATIONSHIP>'_id getter/setter.
          this.define_getter_setter(model_A.prototype, rel.method)


					process.nextTick(() => {
            this.getClass(model_B_name).observe(model_A, id_attr)
            const model_B = RakuOrm.name2model(model_B_name)
						this.define_load_one(model_A, model_B, rel.method)
						this.define_remove_belongs_to(model_A, rel.method)
          })
        }) // relationships.forEach
			} else if (key == 'has_one') {
				const rel_type = key
				let relationships = schema[rel_type]
				if (!Array.isArray(relationships)) { throw klass.name + '.' + rel_type + ' should be an Array' }
				relationships.forEach(rel => {
          // E.g. rel == { model: 'Media', method: 'featured_image'}
          // A has_one B
          const model_A = klass
          const model_A_name = model_A.name
          const model_B_name = rel.model
					const id_attr = rel.method + this.id_postfix(rel_type)
          
          // Track the meta-data (name and type) of the <RELATIONSHIP>_id attribute.
					this.track(model_A, id_attr, rel_type)
       
          // Store inverse relationship.

          RakuOrm.store_inverse_of(model_A_name, rel.method ? (' ' + rel.method).slice(1) : undefined, this.inverse_type(rel_type), model_B_name, rel.inverse_of ? (' ' + rel.inverse_of).slice(1) : undefined, this.inverse_type(rel_type))

          // define <RELATIONSHIP>'_id getter/setter.
          this.define_getter_setter(model_A.prototype, id_attr)

					process.nextTick(() => {
            this.getClass(model_B_name).observe(model_A, id_attr)
            const model_B = RakuOrm.name2model(model_B_name)
						this.define_load_one(model_A, model_B, rel.method)
          })
        })
      }
		} // for
	} // init

	habtm_attr2model_name(attr) {
		let model = null
		this.constructor.schema['habtm'].forEach(hm => {
			if (hm.method + '_ids' == attr) {
				model = hm.model
				return null
			}
		})
    if (model == null) {
		  this.constructor.schema['has_many'].forEach(hm => {
		  	if (hm.method + '_ids' == attr) {
		  		model = hm.model
		  		return null
		  	}
		  })
    }
		return model
	}

	static name2model(klass_name) {
		return this.classes[klass_name]
	}

	async save_habtm_backlink(habtm_attr, disk_values) {
    // Let A habtm B
		// For each habtm id, generate the key for the corresponding belongs_to instance.
		let current_ids = new Set(this.raw_get.call(this, habtm_attr))
    let disk_ids = new Set(disk_values[habtm_attr])

    let delete_ids = new Set([...disk_ids].filter(x => !current_ids.has(x)))
    let append_ids = new Set([...current_ids].filter(x => !disk_ids.has(x)))

		let B = RakuOrm.name2model(this.habtm_attr2model_name(habtm_attr))

		// We're using Riak CRDT sets via raku/no-riak to store back links.
		let save_backlinks = []
    for(const model_id of delete_ids) {
			const m = new B(model_id)
			const backlink_key = m.habtm_backlink_key(this.constructor.name, habtm_attr)
			save_backlinks.push(raku.srem(backlink_key, this.id))
    }
		for(const model_id of append_ids) {
			const m = new B(model_id)
			const backlink_key = m.habtm_backlink_key(this.constructor.name, habtm_attr)
			save_backlinks.push(raku.sadd(backlink_key, this.id))
		}
		return Promise.all(save_backlinks)
	}

  async save_belongs_to_backlink(id_attr, old) {
    const current_fk = this.raw_get(id_attr)
    const previous_fk = old[id_attr]
    const klass = this.constructor.name
    if (current_fk == previous_fk) { return Promise.resolve(-1) }

    const prev_inverse_key = RakuOrm.inverse_key(klass, id_attr, previous_fk)
    const inverse_key = RakuOrm.inverse_key(klass, id_attr, current_fk)
		await raku.srem(prev_inverse_key, this.id)

    let promise = Promise.resolve(1) 
    if (current_fk != null) {
      promise = raku.sadd(inverse_key, this.id)
    }
    return promise
  }

  async save_has_one_backlink(id_attr, old) {
    const current_fk = this.raw_get(id_attr)
    const previous_fk = old[id_attr]
    const klass = this.constructor.name
    if (current_fk == previous_fk) { return Promise.resolve(-1) }

    if (previous_fk) {
			const prev_inverse_key = RakuOrm.inverse_key(klass, id_attr, previous_fk)
			await raku.del(prev_inverse_key)
    }

    const inverse_key = RakuOrm.inverse_key(klass, id_attr, current_fk)
    let promise1 = Promise.resolve(1)
    if (current_fk == null) {
      promise1 = raku.del(inverse_key)
    } else {
      promise1 = raku.put(inverse_key, this.id)
    }
    return promise1
  }

  async save_has_many_backlink(attr, disk_values) {
    // We have to do something special for has_many relationships.
    // The backlinks (B models' belongs_to foreign key) are integers, possibly pointing to other (imminently stale) a's.
    // Since, the relationship is doubly indexed and B belongs to at most 1 instance of A, we need to update the a's
    // has-many array to remove, the b.id that `this` A instance is about to take over.

		let current_ids = new Set(this.raw_get.call(this, attr))
    let disk_ids = new Set(disk_values[attr])
    let delete_ids = new Set([...disk_ids].filter(x => !current_ids.has(x)))
    let new_ids = new Set([...current_ids].filter(x => !disk_ids.has(x)))
		let B = RakuOrm.name2model(this.habtm_attr2model_name(attr))

    // Remove the stolen ids of B from the A's that were linking to it.
    // This is part of enforcing B belongs to at most one A.
    // This needs to happend before the backlink gets overwritten by this.id.
    let update_robbed_As = []
    for (let b_id of new_ids) {
      const b = new B(b_id)
			const backlink_key = b.has_many_backlink_key(this.constructor.name, attr)
      const remove_promise = raku.get(backlink_key)
        .then(a_id => {
          if (a_id && a_id != this.id) {
            return raku.srem(RakuOrm.key_name(this.constructor.name, a_id, attr), b_id)
          } else {
            return -1
          }
        })
			update_robbed_As.push(remove_promise)
    }
    await Promise.all(update_robbed_As)

		let save_backlinks = []
    for(const model_id of delete_ids) {
			const m = new B(model_id)
			const backlink_key = m.has_many_backlink_key(this.constructor.name, attr)
			save_backlinks.push(raku.del(backlink_key, this.id))
    }
		for(const model_id of new_ids) {
			const m = new B(model_id)
			const backlink_key = m.has_many_backlink_key(this.constructor.name, attr)
			save_backlinks.push(raku.put(backlink_key, this.id))
		}
		return Promise.all(save_backlinks)
  }

	save_prop(attr) {
		let type = this.constructor.prop_types[attr]
		let k = this.attr_key(attr)
		let put_fun = this.constructor.set_fun[type]
		let value = this.raw_get.call(this, attr)
		let promise 
		if (type == 'habtm' || type == 'has_many') {
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
		// Save only the dirty keys.
		let dirty_keys = Object.keys(this.dirty)
			.filter(key => key != 'id' && this.dirty[key] != null)
		return promise
      .then(_ => new this.constructor(this.id).load(...dirty_keys))
			.then(disk_values => {
				let backlink_promises = dirty_keys.map(attr => {
            let p1 = that.save_prop(attr)
						let p2 = Promise.resolve(this)
            const attr_type = that.constructor.prop_types[attr]
						if ('habtm' == attr_type) {
							p2 = that.save_habtm_backlink(attr, disk_values)
						} else if ('has_many' == attr_type) {
              p2 = that.save_has_many_backlink(attr, disk_values)
            } else if ('belongs_to' == attr_type) {
              p2 = that.save_belongs_to_backlink(attr, disk_values)
            } else if ('has_one' == attr_type) {
              p2 = that.save_has_one_backlink(attr, disk_values)
            }
            return Promise.all([p1, p2])
					}) //
        return Promise.all(backlink_promises)
					.then(() => that)
			})
	}

	static load(id, ...attrs) {
		let instance = new this(id)
		return instance.load(...attrs)
	}

	initialize_props() {
		let that = this
		this.constructor.props.forEach(attr => {
			let type = that.constructor.prop_types[attr]
			that.raw_set(attr, that.constructor.initial_value[type])
		})
	}

	// Remove associations
	remove(attr, fk_id, type) {
		const key = this.attr_key(attr)
    if (type == 'habtm' || type == 'has_many') {
			return raku.srem(key, fk_id)
    } else {
			return raku.del(key)
    }
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
        const type = model_A.prop_types[model_A_attr]
        let get_A_ids = null
        if (type == 'has_many') {
					key = this.has_many_backlink_key(model_A_name, model_A_attr)
          get_A_ids = raku.get(key).then( res => [ res ] )
        } else if (type == 'belongs_to') {
          key = this.belongs_to_backlink_key(model_A_name, model_A_attr)
          get_A_ids = raku.smembers(key)
        } else if (type =='habtm') {
					key = this.habtm_backlink_key(model_A_name, model_A_attr)
          get_A_ids = raku.smembers(key)
        } else if (type == 'has_one') {
          key = this.belongs_to_backlink_key(model_A_name, model_A_attr)
          get_A_ids = raku.get(key).then( res => [ res ] )
        }
				let update_model_A = get_A_ids
					.then(model_A_ids => Promise.all(model_A_ids.map(id => {
						let a = new model_A(id)
						return a.remove(model_A_attr, that.id, type)
					})))
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

  static key_name(klass_name, id, prop_name) {
    return klass_name + '#' + id + (prop_name ?  ':' +  prop_name : '')
  }

	instance_name() {
		return this.constructor.name + '#' + this.id
	}

	attr_key(prop_name) {
		return this.instance_name() + ':' + prop_name
	}

	has_many_backlink_key(klass, key) {
    const method = key.replace(/_ids$/, '')
    const inverse = RakuOrm.inverse_of(klass, method)
    const backlink_key = inverse ? this.attr_key(inverse.method + '_id') : this.instance_name() + ':' + klass + ':' + key
		return backlink_key
	}

  belongs_to_backlink_key(klass, key) {
    const method = key.replace(/_id$/, '')
    const inverse = RakuOrm.inverse_of(klass, method)
    const backlink_key = inverse ? this.attr_key(inverse.method + '_ids') : this.instance_name() + ':' + klass + ':' + key
		return backlink_key
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
    const that = this
		return Promise.all(attrs.filter(not_id).map(attr => {
				type = this.constructor.prop_types[attr]
				get_fun = this.constructor.get_fun[type]
        if (type == undefined) {
          throw 'Could not find attribute type.  Maybe ' + attr  + ' is not an attribute.'
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
	'habtm': raku.smembers,
	'has_many': raku.smembers,
  'belongs_to': raku.get,
  'has_one': raku.get,
}

RakuOrm.set_fun = {
	'ID': raku.cset,
	'String': raku.put,
	'Integer': raku.cset,
	'habtm': raku.sadd,
	'has_many': raku.sadd,
  'belongs_to': raku.put,
  'has_one': raku.put,
}

RakuOrm.del_fun = {
	'ID': raku.cdel,
	'String': raku.del,
	'Integer': raku.cdel,
	'habtm': raku.sdel,
	'has_many': raku.sdel,
  'belongs_to': raku.del,
  'has_one': raku.del,
}

RakuOrm.initial_value = {
	'ID': null,
	'String': null,
	'Integer': 0,
	'habtm': [],
	'has_many': [],
  'belongs_to': null,
  'has_one': null,
  'Class': null
}

export default RakuOrm
