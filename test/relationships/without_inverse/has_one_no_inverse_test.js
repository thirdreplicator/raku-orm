// has_one_no_inverse_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../../src/RakuOrm'
import { Article, Picture } from '../../models/without_inverse'
import { expectSetEquality } from '../../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('has_one relationship', () => {
  beforeEach(() => raku.deleteAll())

  describe('article.featured_image_id getter/setter', () => {
    it('should be assignable to an integer', () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       
    }) // it

    it('should be changed after an instance reload', async () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       

       await article.save()
       article.featured_image_id = 500
       expect(article.featured_image_id).to.eql(500)

       await article.load('featured_image_id')
       expect(article.featured_image_id).to.eql(42)
    })

    // Update
    it('should be changed on disk if the updated value is saved', async () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       

       await article.save()
       article.featured_image_id = 500
       expect(article.featured_image_id).to.eql(500)

       await article.save()
       await article.load('featured_image_id')
       expect(article.featured_image_id).to.eql(500)
    })
  }) // describe

  describe('article.load_featured_image()', () => {
    it('should load a picture instance', async () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       
       await article.save()

       const picture = new Picture(42)
       picture.article_featured_id = article.id
       await picture.save()

       const picture2 = await article.load_featured_image('location')

       expect(picture2.constructor.name).to.eql('Picture')
    })

    it('should have a article_featured_id pointing to the original article', async () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       
       await article.save()

       const picture = new Picture(42)
       picture.location = '/tmp/hello.png'
       await picture.save()

       const picture2 = await article.load_featured_image('location')
       const backlink_id = await raku.get('Picture#' + picture.id + ':Article:featured_image_id')
       expect(backlink_id).to.eql(article.id)
    })

    it('should load null after removing association by setting featured_image_id=null', async () => {
       const article = new Article()
       expect(article.featured_image_id).to.be.null
       article.featured_image_id = 42
       expect(article.featured_image_id).to.eql(42)       
       await article.save()

       const picture = new Picture(42)
       picture.location = '/tmp/hello.png'
       await picture.save()

       const picture2 = await article.load_featured_image('location')
       expect(picture2.location).to.eql('/tmp/hello.png')

       // Now delete the association.
       article.featured_image_id = null
       await article.save()

       const picture3 = await article.load_featured_image('location')
       expect(picture3).to.be.null
    })
  }) // describe article.load_featured_image

}) // describe has_one

