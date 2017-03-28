// test/helpers.js
import { expect } from 'chai'

function expectSetEquality(s1, s2) {
  expect(s1).to.deep.include.members(s2)
  expect(s2).to.deep.include.members(s1)
}

export { expectSetEquality }
