// has_many_test.js
import Raku from 'raku'
import RakuOrm from '../../src/RakuOrm'
import { expect, assert } from 'chai'
import { User, Post } from '../test_models'

const raku = new Raku()

describe('has_many relationship', () => {
  beforeEach(() => raku.deleteAll())

//describe('belongs_to methods', () => {
//	describe('post.author_id', () => {
//		it('should be null if not set', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should be assignable', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should be savable to disk', () => {
//			asserttitleail('To be implemented.')
//		})
//	}) // desctitlebe post.author_id
//
//	describe('titlest.author = user', () => {
//		it('should change the post.author_id value in memory', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should change the user.posts_ids values in memory to include the new user.id', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.save() should change the post.author_id value on disk', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.save() should change the user.posts_ids values on disk', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // describe post.author=
//
//	describe('post.author', () => {
//		it('if not yet loaded, it should be null', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('if already loaded, it should be the User instance from disk', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // post.author
//
//	describe('post.load("author")', () => {
//		it('should return a promise load the associated author', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('the promise should evaluate to the associated author', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('poast.author should have been changed to the loaded value', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.load("title", ["author", "last_name", "email"]) should load the associated author\'s last_name', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // post.load('author')
//})
})

