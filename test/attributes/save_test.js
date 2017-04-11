// save_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../models/with_inverse'

import Raku from 'raku'
const raku = new Raku()

describe('save()', () => {

  beforeEach(() => raku.deleteAll())

	it('should return a promise', () => {
		let user = new User()
		let promise = user.save()
		return promise
			.then(() => {
				expect(promise.constructor.name).to.eql('Promise')
			})
	})

	it('should generate an id if none exists during a call to save()', () => {
		// reset user id to 0
		let user = new User()
		return raku.cset('User:last_id', 0)
			.then(() => {
					expect(user.id).to.eql(null)
					return user.save()
				})
			.then(() => {
				expect(user.id).to.be.a('number')
				expect(user.id).to.eql(1)
			})
	})

  it('should save/load a single model with no dependencies', () => {
    class Duck extends RakuOrm { }
    Duck.schema = {
      name: 'String'
    }
    RakuOrm.init(Duck)

    let duck = new Duck()
    duck.name = "Donald"
    return duck.save()
      .then(() => {
        expect(duck.name).to.eql('Donald')
        expect(duck.id > 0).to.be.true
      })
      .then(() => Duck.load(duck.id, 'name'))
      .then(p2 => {
				expect(p2.name).to.eql('Donald')
          expect(p2.id).to.eql(duck.id)
			})
  })

	it('should save the attribute to the generated user id during a call to save()', () => {
		// reset user id to 100
		let user = new User()
		return Promise.all([
				raku.cset('User:last_id', 1000),
				raku.del('User#1001:first_name'),
				raku.del('User#1001:last_name')])
			.then(() => {
					expect(user.id).to.eql(null)
					user.first_name = 'David'
					user.last_name = 'Beckwith'
					return user.save()
				})
			.then(user => {
				// in-memory version
				expect(user.id).to.eql(1001)
				expect(user.first_name).to.eql('David')
				expect(user.last_name).to.eql('Beckwith')
			})
			.then(() => User.load(1001, 'first_name', 'last_name'))
			.then(user1001 => {
				// on-disk version
				expect(user1001.id).to.eql(1001)
				expect(user1001.first_name).to.eql('David')
				expect(user1001.last_name).to.eql('Beckwith')
			})
	})

	it('should increment the id after each call to save()', () => {
		let user1 = new User()
		let user2 = new User()
		let user3 = new User()

		// reset user id to 0
		return raku.cset('User:last_id', 0)
			.then(() => user1.save())
			.then(user1 => expect(user1.id).to.be.eql(1))
			.then(() => user2.save())
			.then(user2 => expect(user2.id).to.be.eql(2))
			.then(() => user3.save())
			.then(user3 => expect(user3.id).to.be.eql(3))
	})

	it('if the id is already set, save() should not change it', () => {
		let user = new User()
		expect(user.id).to.eql(null)
		user.id = 42
		expect(user.id).to.eql(42)
		return user.save()
			.then(() => expect(user.id).to.eql(42) )
	})

 it('ids should not overlap as long as you wait for the promise to return', () => {
	 let N = 30
	 let users = Array.from(new Array(N), (v, i) => i)
							 .map(() => new User())
	 return raku.cset('User:last_id', 0)
		 .then(() => {
				let p = Promise.resolve(1)
				users.forEach(u => {
					p = p.then(() => u.save())
				})
				return p
		 })
		 .then(() => {
			 const user_ids = new Set(users.map(u => u.id))
			 expect(user_ids.size).to.eql(N)
		 })
 })

	it('if the id is already set to 42, save() should save the changed attributes in the database of User#42', () => {
		let user = new User()
		expect(user.id).to.eql(null)
		user.id = 42
		expect(user.id).to.eql(42)
		expect(user.first_name).to.eql(null)
		user.first_name = 'David'
		return user.save()
			.then(() => expect(user.id).to.eql(42) ) // in memory value
			.then(() => User.load(42, 'first_name'))
			.then(reloaded_user => expect(reloaded_user.first_name).to.eql('David'))
	})
}) // describe save()


