// utils_test.js

import { assoc_in, update_in } from '../../src/utils'
import { expect, assert } from 'chai'

describe('utils', () => {
	describe('assoc_in', () => {
    it('should take 3 arguments', () => {
      expect(assoc_in({}, [], 'hello')).to.eql({})
    })

    it('should return an empty plain object if undefined is passed in as the map', () => {
      expect(assoc_in(undefined, [], 'hi')).to.eql({})
    })

    it('should throw an error if the first argument is not undefined or a plain object', () => {
      expect(() => { assoc_in(1, [], '') }).to.throw(/assoc_in takes 3 arguments/)
    })

    it('should throw an error if the second argument is not an array', () => {
      expect(() => { assoc_in({}, 1, '') }).to.throw(/assoc_in takes 3 arguments/)
    })

    it('should return the same map if there are no keys to update (ks == [])', () => {
			expect(assoc_in({a: 1}, [])).to.eql({a: 1})
    })

    it('should not be mutated', () => {
      let x = {a: 1}
      assoc_in(x, ['b'], 2)
			expect(x).to.eql({a: 1})
    })

    it('should assign(create) the key if it does not exist', () => {
      expect(assoc_in({}, ['b'], 42)).to.eql({b: 42})
    })

    it('should deeply assign the key list even if it does not exist', () => {
      expect(assoc_in({}, ['c', 'd'], 100)).to.eql({c: {d: 100}})
    })

    it('should not eliminate existing plain objects', () => {
      expect(assoc_in({a: 1, c: {d: 500, r: 75}}, ['c', 'd'], 100)).to.eql({a: 1, c: {d: 100, r: 75}})
    })
	})

	describe('update_in', () => {
    it('should take 3 arguments', () => {
      expect(update_in({}, [], () => 'hello')).to.eql({})
    })

    it('should throw an error if the first argument is not a plain object or undefined', () => {
      expect(() => { update_in(1, [], '') }).to.throw(/update_in takes 3 arguments/)
    })

    it('should throw an error if the second argument is not an array', () => {
      expect(() => { update_in({}, 1, '') }).to.throw(/update_in takes 3 arguments/)
    })

    it('should throw an error if the third argument is not a function', () => {
      expect(() => { update_in({}, [], '') }).to.throw(/update_in takes 3 arguments/)
    })

    it('should return the same map if there are no keys to update (ks == [])', () => {
			expect(update_in({a: 1}, [], () => 'hello')).to.eql({a: 1})
    })

    it('should not be mutated', () => {
      let x = {a: 1}
      update_in(x, ['b'], () => 2)
			expect(x).to.eql({a: 1})
    })

    it('should assign(create) the key if it does not exist', () => {
      expect(update_in({b: 42}, ['b'], (x) => x + 5)).to.eql({b: 47})
    })

    it('should deeply assign the key list even if the nested plain objects do not exist', () => {
      expect(update_in({}, ['c', 'd'], () => 100)).to.eql({c: {d: 100}})
    })

    it('should deeply assign the key list even if the provided map is undefined', () => {
      expect(update_in({}, ['c', 'd'], () => 100)).to.eql({c: {d: 100}})
    })

    it('should not eliminate existing plain objects', () => {
      expect(update_in({a: 1, c: {d: 500, r: 75}}, ['c', 'd'], (x) => x + 1)).to.eql({a: 1, c: {d: 501, r: 75}})
    })

    it('should not overwrite existing values if you pass in a test function that checks for existence.', () => {
      expect(update_in({a: 1, c: {d: 500, r: 75}}, ['c', 'd'], (x) => x || x + 1)).to.eql({a: 1, c: {d: 500, r: 75}})
    })
	})
})
