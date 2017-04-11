// getters_and_setters_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../models/with_inverse'

import Raku from 'raku'
const raku = new Raku()

describe('Getters and setters', () => {
  beforeEach(() => raku.deleteAll())

	describe('string attributes', () => {
		// user.first_name
		it('should be able to store a first_name', () => {
			let user = new User()
			expect(user.first_name).to.eql(null)
			user.first_name = 'David'
			expect(user.first_name).to.eql('David')
		})

		// user.last_name
		it('should be able to store a last_name', () => {
			let user = new User()
			expect(user.last_name).to.eql(null)
			user.last_name = 'Beckwith'
			expect(user.last_name).to.eql('Beckwith')
		})

		// user.email
		it('should be able to store an email address', () => {
			let user = new User()
			expect(user.email).to.eql(null)
			user.email = 'thirdreplicator@gmail.com'
			expect(user.get('email')).to.eql('thirdreplicator@gmail.com')
		})
	}) // describe string attributes

	describe('id', () => {
		it('should be able set an id', () => {
			let user = new User()
			expect(user.id).to.eql(null)
			user.id = 42
			expect(user.id).to.eql(42)
		})

	}) // describe id

})// describe getters and setters.
