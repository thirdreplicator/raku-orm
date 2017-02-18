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

      You need to update both places upon a create or delete of the
        has_many relationship link.
  */

  constructor() {
    // Keep a list of modified properties here.
    this.dirty = {}
    if (this.constructor.props == undefined) return
    let that = this
    this.constructor.props.forEach(attr => {
      let type = that.constructor.prop_types[attr]
      that.set(attr, that.constructor.initial_value[type])
    })
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

  // Call a dynamic property setter.  e.g. this.email=
  //  This invokes custom hooks as well.
  set(k, v) {
    Object.getOwnPropertyDescriptor(this.constructor.prototype, k).set.call(this, v)
    return v
  }

  // Call a dynamic property setter.  e.g. this.email
  //  This invokes custom hooks as well.
  get(k) {
    return Object.getOwnPropertyDescriptor(this.constructor.prototype, k).get.call(this)
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
    return Object.keys(this._observed_keys)
  }

  static observed_keys(klass_name) {
    return this._observed_keys[klass_name]
  }

  // Create getter and setter functions from the schema.
  static init(klass) {
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
        //  hook into it to track 'dirty' properties that need to be
        //  saved in the database.
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
      /*
         TODO:

         In the case of deletion of a possessed instance (right side of has_many relationship),
          we need to observe and update the foreign keys that refer to the deleted instance.
          So, let's store this observer info in e.g.

             Post.observed_keys = { User: ['post_ids', 'favorite_article_id'] } // in-memory
             post.observed_ids = { User: { 42: true, 537: true } } // on disk
      */
        if (klass.observed_keys == undefined) { klass.observed_keys = {} }
        let relationships = schema[key]
        if (Array.isArray(relationships)) {
          relationships.forEach(obj => {
            let attr = obj.key
            let type = 'HasMany'
            this.track(klass, attr, type)
            this.getClass(obj.model).observe(klass, attr)
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
            )
          })
        }
      } // else if
    } // for
  } // init

  save() {
    let that = this
    let promise = Promise.resolve(that)
    // If new instance.
    if (this.id == null) {
      promise = promise
        .then(() => raku.cinc(this.constructor.last_id_key()))
        .then(value => {
            that.id = value
            return that
          })
    }

    // Now we have an id for this instance.
    return promise
      .then(() => {
        // Save the dirty keys.
        let dirty_keys = Object.keys(this.dirty)
          .filter(key => key != 'id' && this.dirty[key] != null)
        let promises = dirty_keys.map(attr => {
            let type = this.constructor.prop_types[attr]
            let set_fun = this.constructor.set_fun[type]
            let k = that.attr_key(attr)
            let v = that.raw_get.call(that, attr)
            return set_fun.call(raku, k, v)
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

  delete_props() {
    let that = this
    let delete_promises = []
    this.constructor.props.forEach(attr => {
      let type = that.constructor.prop_types[attr]
      let del_fun = that.constructor.del_fun[type]
      let k = that.attr_key(attr)
      delete_promises.push(del_fun.call(raku, k))
    })
    return delete_promises
  }

  delete() {
    let that = this
    return Promise.all(this.delete_props()) // on disk
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

  has_many_back_link_key(klass, key) {
    return this.instance_name() + ':' + klass + ':' + key
  }

  load(...attrs) {
    return Promise.all(attrs.map(attr => {
        let type = this.constructor.prop_types[attr]
        let get_fun = this.constructor.get_fun[type]
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
  'HasMany': raku.get
}

RakuOrm.set_fun = {
  'ID': raku.cset,
  'String': raku.set,
  'Integer': raku.cset,
  'HasMany': raku.set
}

RakuOrm.del_fun = {
  'ID': raku.cdel,
  'String': raku.del,
  'Integer': raku.cdel,
  'HasMany': raku.del
}

RakuOrm.initial_value = {
  'ID': null,
  'String': null,
  'Integer': 0,
  'HasMany': []
}

export default RakuOrm
