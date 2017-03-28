// helper_methods_test.js
// Testing RakuOrm static helper methods
import Raku from 'raku'
import RakuOrm from '../../src/RakuOrm'
import { expect, assert } from 'chai'
import { User, Post } from '../test_models'

const raku = new Raku()

describe('RakuOrm static methods', () => {
	describe('RakuOrm.getClass()', () => {
    it('should be able to get a reference to the actual class from a string.', () => {
			expect(RakuOrm.getClass('User')).to.eql(User)
			expect(RakuOrm.getClass('Post')).to.eql(Post)
    })
	})

	describe('lastId()', () => {
    it('should return the User:last_id for the User class', () => {
			return Promise.all([raku.cget('User:last_id'), User.lastId()])
				.then(([v, v2]) => expect(v).to.be.a('number') && expect(v2).to.eql(v))
    })
	})

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
  
    describe('habtm back link keys (back link key)', () => {
      // E.g. if a User habtm Posts,
      //  you should be able to track all the users who have a given post
      //  Post#42:User:posts_ids
      it ('should look like Post#42:User:posts_ids when there is an inverse', () => {
        let post = new Post()
        post.id = 500
  
        let key = post.habtm_backlink_key('User', 'posts_ids')
        expect(key).to.eql('Post#500:authors_ids')
      })
    })
  }) // describe 'Key generation for instances'
}) // describe 'RakuOrm static methods'
