// counter_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../models/with_inverse'

import Raku from 'raku'
const raku = new Raku()

describe('counter (integer) attributes', () => {
  beforeEach(() => raku.deleteAll())

	describe('Post:views: Number', () => {
		it('the attr should know its type', () => {
			expect(Post.schema.views).to.eql('Integer')
		})

		it ('should be able to store numbers in memory', () => {
			let post = new Post()
			post.views = 500
			expect(post.views).to.eql(500)
		})

		it('should be able to load stored integers from the database', () => {
			return raku.cset('Post:last_id', 0)
				.then(() => (new Post()).save())
				.then(post => expect(post.id).to.eql(1))
				.then(() => raku.cset('Post#1:views', 42))
				.then(() => Post.load(1, 'views'))
				.then(post => expect(post.views).to.eql(42))
		})

		it('should be able to save stored integers into the database', () => {
			let post = new Post()
			return raku.cset('Post:last_id', 0)
				.then(() => {
						post.views = 123
						return post.save()
					})
				.then(() => expect(post.id).to.eql(1))
				.then(() => raku.cget('Post#1:views'))
				.then(num_views => expect(num_views).to.eql(123))
		})
	})

	describe('inc()', () => {
		it('should increment Integer-type attributes', () => {
			let post = new Post()
			return raku.cset('Post:last_id', 300)
				.then(() => post.save())
				.then(() => expect(post.id).to.eql(301))
				.then(() => post.inc('views')) // increment 3 times
				.then(() => post.inc('views'))
				.then(() => post.inc('views'))
				.then(() => Post.load(301, 'views'))
				.then(post => expect(post.views).to.eql(3))
		})
	})
}) // describe counter attributes


