import RakuOrm from '../src/RakuOrm'

import { expect } from 'chai'

class User extends RakuOrm { }
class Post extends RakuOrm { }

describe('Key generation for instances', () => {
  describe('last_id key', () => {
    it('should be of the form <CLASS>:last_id', () => {
      let key = User.last_id_key()
      expect(key).to.eql('User:last_id')
    })
  })

  describe('instance names', () => {
    it('should be of the form <CLASS>#<INSTANCE ID>', () => {
      let user = new User()
      user.id = 42

      expect(user.instance_name()).to.eql('User#42')
    })
  })

  describe('attribute keys', () => {
    it('should look like <INSTANCE NAME>:<ATTRIBUTE>', () => {
      let user = new User()
      user.id = 42

      let attribute = 'first_name'
      let key = user.attr_key(attribute)
      expect(key).to.eql('User#42:first_name')
    })
  })

  describe('has_many relationship keys', () => {
    it('should look like an attribute key with "_ids" attached to it.', () => {
      let user = new User()
      user.id = 42

      let klass_name = 'Post'
      let key = user.has_many_key(klass_name)
      expect(key).to.eql('User#42:post_ids')
    })
  })

  describe('has_many back link keys (back link key)', () => {
    // E.g. if a User has_many Posts,
    //  you should be able to track all the users who have a given post
    //  Post#42:User:post_ids
    it ('should look like Post#42:User:post_ids', () => {
      let post = new Post()
      post.id = 500

      let key = post.has_many_backlink_key('User', 'post_ids')
      expect(key).to.eql('Post#500:User:post_ids')
    })
  })
}) // describe
