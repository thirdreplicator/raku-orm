// delete_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../test_models'

import Raku from 'raku'
const raku = new Raku()

describe('delete()', () => {

	beforeEach(() => raku.deleteAll())

	it("attributes should be null after the instance is deleted", () => {
		let user = new User()
		let user_id = 42
		user.id = user_id
		user.first_name = 'Tom'
		return user.save()
			.then(() => raku.get('User#' + user_id + ':first_name'))
			.then(first_name => expect(first_name).to.eql('Tom'))
			.then(() => { return user.delete() })
			.then((promises) => {
				// values in memory
				expect(user.id).to.be.null
				expect(user.first_name).to.be.null
				expect(user.posts_ids).to.eql([])
			})
			.then(() => Promise.all([raku.get('User#' + user_id + ':first_name'), raku.cget('User#' + user_id + ':id')]))
			.then(([first_name, id]) => {
				// values from disk
				expect(id).to.eql(0)
				expect(first_name).to.be.null
			})
	})
}) // describe delete()

