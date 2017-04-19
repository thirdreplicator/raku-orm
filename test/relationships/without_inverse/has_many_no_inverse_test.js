// has_many_no_inverse_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../../src/RakuOrm'
import { Person, Article} from '../../models/without_inverse'
import { expectSetEquality } from '../../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('has_many relationship', () => {
  beforeEach(() => raku.deleteAll())

  describe('has_many relationship, e.g. user.load_approved_articles()', () => {
    // CREATE
    it('should save approved articles in approved_articles_ids', async () => {
      // Assigning the approved_articles_ids should be saved to disk.
      const article1 = new Article()
      article1.title = 'title1'
 
      const article2 = new Article()
      article2.title = 'title2'

      //await Promise.all([article1.save(), article2.save()])

      const user = new Person()
      user.first_name = 'David'
      user.approved_articles_ids = [article1.id, article2.id]
      await user.save()

      const approved_ids = await raku.smembers(user.attr_key('approved_articles_ids'))
      expectSetEquality(approved_ids, [article1.id, article2.id])
    })

    // READ
	  it('should load approved articles', async () => {
      // Assigning the approved_articles_ids should cause the backlink to be saved to disk too.
      const article1 = new Article()
      article1.title = 'title1'
 
      const article2 = new Article()
      article2.title = 'title2'

      await Promise.all([article1.save(), article2.save()])

      const user = new Person()
      user.first_name = 'David'
      user.approved_articles_ids = [article1.id, article2.id]
      await user.save()
     
      const approved_articles = await user.load_approved_articles('title') 
      expect(approved_articles[0].constructor.name).to.eql('Article')
      expectSetEquality(approved_articles.map(p => p.id), user.approved_articles_ids)
      expectSetEquality(approved_articles.map(p => p.title), ['title1', 'title2'])
	  })

    // UPDATE
    it('should overwrite the updated approver when new values are assigned', async () => {
      // Change the set of approved articles by assigning user.approved_articles_ids.
      //  This change should delete old associations and create new ones.
      const article1 = new Article()
      article1.title = 'title1'
 
      const article2 = new Article()
      article2.title = 'title2'

      const article3 = new Article()
      article3.title = 'title3'

      await article1.save()
      await article2.save()
      await article3.save()

      const user1 = new Person()
      user1.first_name = 'David'
      user1.approved_articles_ids = [article1.id, article2.id]

      const user2 = new Person()
      user2.first_name = 'Aris'

      await user1.save()
      await user2.save()
     
      const approved_articles1 = await user1.load_approved_articles('title') 
      const approved_articles2 = await user2.load_approved_articles('title') 
      expectSetEquality(approved_articles1.map(p => p.title), ['title1', 'title2'])
      expectSetEquality(approved_articles2.map(p => p.title), [])

      // Now set user2's approved articles.
      user2.approved_articles_ids = [article2.id, article3.id]
      await user2.save()

      const reloaded_articles1 = await user1.load_approved_articles('title')
      const reloaded_articles2 = await user2.load_approved_articles('title')
      const reloaded_titles1 = reloaded_articles1.map(p => p.title)
      const reloaded_titles2 = reloaded_articles2.map(p => p.title)
      expectSetEquality(reloaded_titles2, ['title2', 'title3'])

      expectSetEquality(reloaded_titles1, ['title1'])

    })

    // DELETE
    it('should delete approvers when new values are assigned (and saved).', async () => {
      const article1 = new Article()
      article1.title = 'title1'
 
      const article2 = new Article()
      article2.title = 'title2'

      const article3 = new Article()
      article3.title = 'title3'

      await article1.save()
      await article2.save()
      await article3.save()

      const user = new Person()
      user.first_name = 'David'
      user.approved_articles_ids = [article1.id, article2.id, article3.id]
      await user.save()

      const approver_ids = await Promise.all([1,2,3].map(id => raku.get('Article#'+id+':Person:approved_articles_ids')))
      expect(approver_ids).to.eql([user.id, user.id, user.id])

      // Now delete article2.  It should be removed from the list of user.approved_articles.
      await article2.delete() 

      const reloaded_articles = await user.load_approved_articles('title')
      const reloaded_titles = reloaded_articles.map(p => p.title)
      expectSetEquality(reloaded_titles, ['title1', 'title3'])
    })
  })


}) // 
