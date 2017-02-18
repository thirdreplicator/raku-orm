import RakuOrm from '../src/RakuOrm'

import { expect, assert } from 'chai'

class User extends RakuOrm { }
describe('User subclass', () => {
  it('should be able to know its class name', () => {
    const user = new User()
    expect(user.constructor.name).to.eql('User')
  })

}) // describe
