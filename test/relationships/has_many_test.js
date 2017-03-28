// has_many_test.js
import Raku from 'raku'
import RakuOrm from '../../src/RakuOrm'
import { expect, assert } from 'chai'
import { User, Post } from '../test_models'

const raku = new Raku()

describe('has_many relationship', () => {
  beforeEach(() => raku.deleteAll())
})

