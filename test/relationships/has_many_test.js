// has_many_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../test_models'
import { expectSetEquality } from '../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('has_many relationship', () => {
  beforeEach(() => raku.deleteAll())

  describe('has_many relationship, e.g. user.approved_articles()', () => {
    // CREATE
    it('should save approved articles in approved_articles_ids', async () => {
      // Assigning the approved_articles_ids should be saved to disk.
      const post1 = new Post()
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.title = 'title2'

      //await Promise.all([post1.save(), post2.save()])

      const user = new User()
      user.first_name = 'David'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()

      const approved_ids = await raku.smembers(user.attr_key('approved_articles_ids'))
      expectSetEquality(approved_ids, [post1.id, post2.id])
    })

    // READ
	  it('should load approved articles', async () => {
      // Assigning the approved_articles_ids should cause post.approver_id to be saved to disk too.
      const post1 = new Post()
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.title = 'title2'

      await Promise.all([post1.save(), post2.save()])

      const user = new User()
      user.first_name = 'David'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()
     
      const approved_articles = await user.approved_articles('title') 
      expect(approved_articles[0].constructor.name).to.eql('Post')
      expectSetEquality(approved_articles.map(p => p.id), user.approved_articles_ids)
      expectSetEquality(approved_articles.map(p => p.title), ['title1', 'title2'])
	  })

    // UPDATE
    it('should overwrite the updated approver when new values are assigned', async () => {
      // Change the set of approved articles by assigning user.approved_articles_ids.
      //  This change should delete old associations and create new ones.
      const post1 = new Post()
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.title = 'title2'

      const post3 = new Post()
      post3.title = 'title3'

      await post1.save()
      await post2.save()
      await post3.save()

      const user1 = new User()
      user1.first_name = 'David'
      user1.approved_articles_ids = [post1.id, post2.id]

      const user2 = new User()
      user2.first_name = 'Aris'

      await user1.save()
      await user2.save()
     
      const approved_articles1 = await user1.approved_articles('title') 
      const approved_articles2 = await user2.approved_articles('title') 
      expectSetEquality(approved_articles1.map(p => p.title), ['title1', 'title2'])
      expectSetEquality(approved_articles2.map(p => p.title), [])

      // Now set user2's approved articles.
      user2.approved_articles_ids = [post2.id, post3.id]
      await user2.save()

      const reloaded_articles1 = await user1.approved_articles('title')
      const reloaded_articles2 = await user2.approved_articles('title')
      const reloaded_titles1 = reloaded_articles1.map(p => p.title)
      const reloaded_titles2 = reloaded_articles2.map(p => p.title)
      expectSetEquality(reloaded_titles2, ['title2', 'title3'])

      expectSetEquality(reloaded_titles1, ['title1'])

      //await Promise.all([post1, post2, post3].map(p => p.load('approver_id')))
      //expect(post1.approver_id).to.eql(user1.id)
      //expect(post2.approver_id).to.eql(user2.id)
      //expect(post3.approver_id).to.eql(user2.id)
    })

    // DELETE
    it('should delete approvers when new values are assigned (and saved).', async () => {
      const post1 = new Post()
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.title = 'title2'

      const post3 = new Post()
      post3.title = 'title3'

      await post1.save()
      await post2.save()
      await post3.save()

      const user = new User()
      user.first_name = 'David'
      user.approved_articles_ids = [post1.id, post2.id, post3.id]
      await user.save()
   
      await Promise.all([post1, post2, post3].map(p => p.load('approver_id')))
      expect(post1.approver_id).to.eql(user.id)
      expect(post2.approver_id).to.eql(user.id)
      expect(post3.approver_id).to.eql(user.id)

      // Now delete post2.  It should be removed from the list of user.approved_articles.
      await post2.delete() 

      const reloaded_articles = await user.approved_articles('title')
      const reloaded_titles = reloaded_articles.map(p => p.title)
      expectSetEquality(reloaded_titles, ['title1', 'title3'])
      
    })
  })


  describe('belongs_to relationship e.g. post.load_approver()', () => {
    // READ (by load_approver()
    it('should return a single approver', async () => {
      const user1 = new User()
      user1.first_name = 'Peter'
      await user1.save()

      const user2 = new User()
      user2.first_name = 'Holly'
      await user2.save()

      const post = new Post()
      post.title = 'title1'
      post.approver_id = user1.id
      await post.save()

      // First set post.approver to user1
      const approver1 = await post.load_approver('first_name')
      expect(approver1.first_name).to.eql(user1.first_name)

      // Then set it to another user.
      post.approver_id = user2.id
      await post.save()

      // reload the approver.
			// Two users try to become the approver.  Last write wins.
      const approver2 = await post.load_approver('first_name')
      expect(approver2.first_name).to.eql(user2.first_name)
      
    })

    // READ (by getting post.approver)
    it('should be accessible as post.approver', async () => {
      const user1 = new User()
      user1.first_name = 'Peter'
      await user1.save()

      const post = new Post()
      post.title = 'title1'
      post.approver_id = user1.id
      await post.save()

      // Set post.approver to user1
      await post.load_approver('first_name')
      expect(post.approver.first_name).to.eql(user1.first_name)
    })

    //// CREATE
    //it('should be assignable by an instance', async () => {
    //  // E.g. post.approver = user
    //  // This will set the post.approver_id == user.id, which will persist
    //  //   the approver upon post.save()
    //  const user = new User()
    //  user.first_name = 'Paul'
    //  await user.save()

    //  const post = new Post()
    //  post.approver = user

    //  await post.save()
    //  expect(post.approver_id).to.eql(user.id)
    //})

    // CREATE
    it('should be assignable by assigning post.approver_id', async () => {
      const user = new User()
      user.first_name = 'David'
      await user.save()

      const post1 = new Post()
      post1.approver_id = user.id
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.approver_id = user.id
      post2.title = 'title2'

      await Promise.all([post1.save(), post2.save()])

	  	const approver1_id = await raku.get(post1.attr_key('approver_id'))
	  	const approver2_id = await raku.get(post2.attr_key('approver_id'))

      expect(approver1_id).to.eql(user.id)
      expect(approver2_id).to.eql(user.id)
    })

    // CREATE
    it('should be assignable by assigning user.approved_articles_ids', async () => {
      const post1 = new Post()
      post1.title = 'title1'
 
      const post2 = new Post()
      post2.title = 'title2'

      await Promise.all([post1.save(), post2.save()])

      const user = new User()
      user.first_name = 'David'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()

	  	const approver1_id = await raku.get(post1.attr_key('approver_id'))
	  	const approver2_id = await raku.get(post2.attr_key('approver_id'))

      expect(approver1_id).to.eql(user.id)
      expect(approver2_id).to.eql(user.id)
    })

    // READ a non-existent approver
    it('should load null if the approver has not been set yet.', async () => {
      const user = new User()
      user.first_name = 'Elmo'
      await user.save()

      const post = new Post()
      await post.save()

      const approver = await post.load_approver('first_name')
      expect(approver).to.be.null
    })

    // READ
    it('should be loadable by invoking post.load_approver(...<ATTRS>)', async () => {
      const user = new User()
      user.first_name = 'Arnold'
      await user.save()

      const post = new Post()
      post.approver_id = user.id
      post.title = 'title1'
      await post.save() 

      const approver = await post.load_approver('first_name')
      expect(approver.first_name).to.eql('Arnold')
    })

    // DELETE by setting approver_id = null
    it('should be deletable', async () => {
      const user = new User()
      user.first_name = 'John'
      await user.save()

      const post = new Post()
      post.approver_id = user.id
      post.title = 'title1'
      await post.save() 
      expect(post.approver_id).to.eql(user.id)

      // set the approver_id = null
      post.approver_id = null
      await post.save()

      const reloaded_post = await post.load('approver_id')
      expect(reloaded_post.approver_id).to.be.null
    })
   
    // DELETE by calling post.remove_approver()
    it('should be deletable by calling post.remove_approver()', async () => {
      const user = new User()
      user.first_name = 'John'
      await user.save()

      const post = new Post()
      post.approver_id = user.id
      post.title = 'title1'
      await post.save() 
      expect(post.approver_id).to.eql(user.id)

      // remove the approver
      await post.remove_approver()

      const reloaded_post = await post.load('approver_id')
      expect(reloaded_post.approver_id).to.be.null
    })

    // post.approver_id=null causes user.approved_articles_ids to be updated.
    it('it should update user.approved_articles_ids when post.approver_id=null; post.save()', async () => {
      const post1 = new Post()
      post1.title = 'title1'
      await post1.save()

      const post2 = new Post()
      post2.title = 'title2'
      await post2.save()

      const user = new User()
      user.first_name = 'Roger'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()
   
      await Promise.all([post1.load('approver_id'), post2.load('approver_id')])
      const user_reloaded1 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded1.approved_articles_ids, [post1.id, post2.id])
      
      // remove the approver
      post1.approver_id = null
      await post1.save() 

      const user_reloaded2 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded2.approved_articles_ids, [post2.id])
    })

    // Deletion of approver causes user.approved_articles_ids to be updated.
    it('it should update user.approved_articles_ids when post.approver is deleted', async () => {
      const post1 = new Post()
      post1.title = 'title1'
      await post1.save()

      const post2 = new Post()
      post2.title = 'title2'
      await post2.save()

      const user = new User()
      user.first_name = 'Roger'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()
   
      await Promise.all([post1.load('approver_id'), post2.load('approver_id')])
      const user_reloaded1 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded1.approved_articles_ids, [post1.id, post2.id])
      
      // remove the approver
      await post1.delete()
      const user_reloaded2 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded2.approved_articles_ids, [post2.id])
    })

    // "remove_approver()" causes user.approved_articles_ids to be updated.
    it('it should update user.approved_articles_ids when post.remove_approver() is called', async () => {
      const post1 = new Post()
      post1.title = 'title1'
      await post1.save()

      const post2 = new Post()
      post2.title = 'title2'
      await post2.save()

      const user = new User()
      user.first_name = 'Roger'
      user.approved_articles_ids = [post1.id, post2.id]
      await user.save()
   
      await Promise.all([post1.load('approver_id'), post2.load('approver_id')])
      const user_reloaded1 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded1.approved_articles_ids, [post1.id, post2.id])
      
      // remove the approver
      await post1.remove_approver()
      const user_reloaded2 = await user.load('approved_articles_ids')
      expectSetEquality(user_reloaded2.approved_articles_ids, [post2.id])
    })
  }) // describe belongs_to
}) // 
