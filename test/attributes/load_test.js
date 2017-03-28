// load_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../test_models'

import Raku from 'raku'
const raku = new Raku()

describe('load()', () => {

	beforeEach(() => raku.deleteAll())

  it('should throw an error if trying to load an undefined attribute', () => {
    expect(() => {
      let user = new User(42)
      user.load('email', 'asdf')
    }).to.throw(/asdf is not an attribute/i)
  })

	it('should return a promise', () => {
		let user = new User()
		let promise = user.load()
		return promise
			.then(() => {
				expect(promise.constructor.name).to.eql('Promise')
			})
	})

	it('should load a user attribute', () => {
		let user = new User(501)
		return raku.set('User#501:first_name', 'Roger')
			.then(() => user.load('first_name'))
			.then(() => expect(user.first_name).to.eql('Roger'))
	})

  it('should not overwrite the id from the database value(0)', () => {
		let user = new User(501)
		return user.load('id')
			.then(() => expect(user.id).to.eql(501))
  })

  it('static User.load(id, "id") should also not overwrite the id from the database value(0)', () => {
		return User.load(501, 'id')
			.then(user => expect(user.id).to.eql(501))
  })
}) // describe load()
