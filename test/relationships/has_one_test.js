// has_one_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { Post, Media } from '../models/with_inverse'
import { expectSetEquality } from '../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('has_one relationship', () => {
  beforeEach(() => raku.deleteAll())

  describe('post.featured_image_id getter/setter', () => {
    it('should be assignable to an integer', () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       
    }) // it

    it('should be changed after an instance reload', async () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       

       await post.save()
       post.featured_image_id = 500
       expect(post.featured_image_id).to.eql(500)

       await post.load('featured_image_id')
       expect(post.featured_image_id).to.eql(42)
    })

    // Update
    it('should be changed on disk if the updated value is saved', async () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       

       await post.save()
       post.featured_image_id = 500
       expect(post.featured_image_id).to.eql(500)

       await  post.save()
       await post.load('featured_image_id')
       expect(post.featured_image_id).to.eql(500)
    })
  }) // describe

  describe('post.load_featured_image()', () => {
    it('should load a media instance', async () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       
       await post.save()

       const media = new Media(42)
       media.post_featured_id = post.id
       await media.save()

       const media2 = await post.load_featured_image('post_featured_id')

       expect(media2.constructor.name).to.eql('Media')
    })

    it('should have a post_featured_id pointing to the original post', async () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       
       await post.save()

       const media = new Media(42)
       media.post_featured_id = post.id
       media.location = '/tmp/hello.png'
       await media.save()

       const media2 = await post.load_featured_image('post_featured_id', 'location')
       expect(media2.post_featured_id).to.eql(post.id)
       expect(media2.location).to.eql('/tmp/hello.png')
    })

    it('should load null after removing association by setting featured_image_id=null', async () => {
       const post = new Post()
       expect(post.featured_image_id).to.be.null
       post.featured_image_id = 42
       expect(post.featured_image_id).to.eql(42)       
       await post.save()

       const media = new Media(42)
       media.post_featured_id = post.id
       media.location = '/tmp/hello.png'
       await media.save()

       const media2 = await post.load_featured_image('post_featured_id', 'location')
       expect(media2.post_featured_id).to.eql(post.id)

       // Now delete the association.
       post.featured_image_id = null
       await post.save()

       const media3 = await post.load_featured_image('post_featured_id', 'location')
       expect(media3).to.be.null
    })
  }) // describe post.load_featured_image

  describe('inverse: media', () => {
    it('should have a media.post_featured_id==post.id if post.featured_image_id = media.id', async () => {
			const media = new Media(42)
      media.location = '/tmp/hello.png'
      await media.save()

      const post = new Post()
      post.featured_image_id = 42
      await post.save()

      await media.load('post_featured_id')
      expect(media.post_featured_id).to.eql(post.id)
    })

    it('should load the original post title', async () => {
			const media = new Media(42)
      media.location = '/tmp/hello.png'
      await media.save()

      const post = new Post()
      post.title = 'original title'
      post.featured_image_id = 42
      await post.save()

      const post2 = await media.load_post_featured('title', 'featured_image_id')
      expect(post2.title).to.eql('original title')
      expect(post2.featured_image_id).to.eql(42)
    })

    // remove association from the inverse side.
    it('should load a null post_featured association if media.post_featured_id was set to null', async () => {
			const media = new Media(42)
      media.location = '/tmp/hello.png'
      await media.save()

      const post = new Post()
      post.title = 'original title'
      post.featured_image_id = 42
      await post.save()

      // Now, delete the association on the media side.
      media.post_featured_id = null
      await media.save()

      // See that the previously associated post is no longer loaded.
      const post2 = await media.load_post_featured('title', 'featured_image_id')
      expect(post2).to.be.null
    })

    // Update association & backlink key
    it('should load updated association if the association is updated', async () => {
			const media = new Media(42)
      media.location = '/tmp/hello.png'
      await media.save()

			const media2 = new Media(1000)
      media2.location = '/tmp/good-bye.png'
      await media2.save()

      const post = new Post()
      post.title = 'original title'
      post.featured_image_id = 42
      await post.save()

      // Now update the association to point to the 2nd image.
      post.featured_image_id = 1000
      await post.save()

      // The reloaded association should be the 2nd image.
      const media_reloaded = await post.load_featured_image('location', 'post_featured_id')
      expect(media_reloaded.location).to.eql('/tmp/good-bye.png')
      expect(media_reloaded.post_featured_id).to.eql(post.id)

      // Also, the first image should now point to a null post.
      await media.load('location', 'post_featured_id')
      expect(media.location).to.eql('/tmp/hello.png')
      expect(media.post_featured_id).to.eql(null)
      expect(await media.load_post_featured('title')).to.be.null
    })
  }) // describe inverse: media

}) // describe has_one

