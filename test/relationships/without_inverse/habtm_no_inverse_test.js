// habtm_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../../src/RakuOrm'
import { Article, Person } from '../../models/without_inverse'
import { expectSetEquality } from '../../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('habtm relationship WITHOUT INVERSE', () => {
  beforeEach(() => raku.deleteAll())

	describe('person.articles_ids', () => {
		it('should return an empty list if there are no articles associated with the person.', () => {
			let person = new Person()
			person.first_name = 'David'
			expect(person.articles_ids).to.eql([])
		})

		it('person.articles_ids = [1, 2, 3] should change the array in memory', () => {
			let person = new Person()
			person.first_name = 'David'

			person.articles_ids = [4, 10]
			expect(person.articles_ids).to.eql([4, 10])
		})
	}) // person.articles_ids

	describe('person.save()', () => {
		it('should save backlinks from articles to the saved person.id', () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]

			let article = new Article()
			article.id = 542
			return person.save()
				.then(() => raku.sismember('Article#542:Person:articles_ids', person.id))
				.then(res => expect(res).to.be.true)
		})

		it('should return an array of person.articles_ids', () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]

			return person.save()
        .then(_ => person.load('articles_ids'))
				.then(u => expectSetEquality(u.articles_ids, [542, 1001]))
		})

		it('should remove backlinks that previously existed', () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]

			return person.save()
				.then(() => raku.sismember('Article#542:Person:articles_ids', person.id))
				.then(res => expect(res).to.be.true)
        .then(() => {
          person.articles_ids = [5, 1001]
          return person.save()
        }) 
				.then(() => raku.sismember('Article#542:Person:articles_ids', person.id))
				.then(res => expect(res).to.be.false)
   
		})
	})

	describe('person.load("articles_ids")', () => {
		it('should return a list of all ids if they exist', () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]
			return person.save()
				.then(() => {
					return person.load('articles_ids', 'first_name')
				})
				.then(person2 => {
					expect(person2.first_name).to.eql('Loader')
					expect(person2.articles_ids).to.eql([542, 1001])
				})
		}) // it

		it("Article needs to have a list of incoming foreign keys in person.", () => {
			expect(RakuOrm.dependent_keys('Article', 'Person').indexOf('articles_ids')).not.to.eql(-1)
		})

		it("deleted articles should be deleted from the person's list of articles_ids", () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]

			let article = new Article()
			article.id = 542
			return raku.sdel('Article#542:Person:articles_ids')
				.then(() => person.save())
				.then(() => article.delete())
				.then(() => {
					 return Person.load(person.id, 'articles_ids')
				 })
				.then(u => expect(u.articles_ids).to.eql([1001]))
		})

		it('person.save() should save the back link to that person in the corresponding article\'s instance data.', () => {
			let person = new Person()
			person.first_name = 'Loader'
			person.articles_ids = [542, 1001]

			return raku.sdel('Article#542:authors_ids')
				.then(() => person.save())
				.then(() => raku.smembers('Article#542:Person:articles_ids'))
				.then(backlinks => expect(backlinks).to.eql([person.id]))
		})

		it("deleted articles should delete their backlinks to articles_ids", () => {
			let person = new Person()
			person.articles_ids = [542, 1001]
			let article = new Article(542)

			return raku.sdel('Article#542:authors_ids')
				.then(() => person.save())
				.then(() => article.delete())
				.then(() => raku.smembers('Article#542:authors_ids'))
				.then(backlinks => expect(backlinks).to.eql([]))
		})
	}) // person.load("articles_ids")

	describe('person.load_articles(...<ATTRIBUTES>, [LIMIT, [OFFSET]])', () => {

		it('should return a list of articles instances', () => {
			let person = new Person()
			person.first_name = 'David'

			let article1 = new Article()
			article1.title = 'title1'

			let article2 = new Article()
			article2.title = 'title2'
		 
			return Promise.all([article1.save(), article2.save()])
				.then(([p1, p2]) => {
					expect([article1.id, article2.id]).to.eql([p1.id, p2.id])
					person.articles_ids = [p1.id, p2.id]
					return person.save()
				})
				.then(u => u.load_articles())
				.then(articles => {
					expect(articles[0].constructor.name).to.eql('Article')
					expect(articles[1].constructor.name).to.eql('Article')
				})
			
		})

		it('person.load_articles() should each instance should have the id property set to a number in the same order as person.articles_ids', () => {
			let person = new Person()
			person.first_name = 'David'

			let article1 = new Article()
			article1.title = 'title1'

			let article2 = new Article()
			article2.title = 'title2'
		 
			return Promise.all([article1.save(), article2.save()])
				.then(([p1, p2]) => {
					person.articles_ids = [p1.id, p2.id]
					return person.save()
				})
				.then(u => u.load_articles())
				.then(articles => {
					expectSetEquality(articles.map(p => p.id), [article1.id, article2.id])
				})
		})

		it('person.load_articles() (with no arguments) should not load any attributes except for the id', () => {
			let person = new Person()
			person.first_name = 'David'

			let article1 = new Article()
			article1.title = 'title1'

			let article2 = new Article()
			article2.title = 'title2'
		 
			return Promise.all([article1.save(), article2.save()])
				.then(([p1, p2]) => {
					person.articles_ids = [p1.id, p2.id]
					return person.save()
				})
				.then(u => u.load_articles())
				.then(articles => {
          articles.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
					expect(articles[0].title).to.eql(null)
					expect(articles[0].body).to.eql(null)
					expect(articles[0].views).to.eql(0)
					expect(articles[1].title).to.eql(null)
					expect(articles[1].body).to.eql(null)
					expect(articles[1].views).to.eql(0)
				})
		})

		it('person.load_articles("title") should load the title property from the database', () => {
			let person = new Person()
			person.first_name = 'David'

			let article1 = new Article()
			article1.title = 'title1'

			let article2 = new Article()
			article2.title = 'title2'
		 
			return Promise.all([article1.save(), article2.save()])
				.then(([p1, p2]) => {
					person.articles_ids = [p1.id, p2.id]
					return person.save()
				})
				.then(u => u.load_articles('title'))
				.then(articles => {
          articles.sort((a, b) => a.title.localeCompare(b.title))
					expect(articles[0].title).to.eql('title1')
					expect(articles[0].body).to.eql(null)
					expect(articles[0].views).to.eql(0)
					expect(articles[1].title).to.eql('title2')
					expect(articles[1].body).to.eql(null)
					expect(articles[1].views).to.eql(0)
				})
		})

		it('person.load_articles("title", "views") should load the title and views properties from the database', () => {
			let person = new Person()
			person.first_name = 'David'

			let article1 = new Article()
			article1.title = 'title1'
			article1.views = 828

			let article2 = new Article()
			article2.title = 'title2'
			article2.views = 239		 

			return Promise.all([article1.save(), article2.save()])
				.then(([p1, p2]) => {
					person.articles_ids = [p1.id, p2.id]
					return person.save()
				})
				.then(u => u.load_articles('title', 'views'))
				.then(articles => {
          articles.sort((a, b) => a.title.localeCompare(b.title))
					expect(articles[0].title).to.eql('title1')
					expect(articles[0].body).to.eql(null)
					expect(articles[0].views).to.eql(828)
					expect(articles[1].title).to.eql('title2')
					expect(articles[1].body).to.eql(null)
					expect(articles[1].views).to.eql(239)
				})
		})

		it('person.load_articles("title", "views") should not load more than 10 records by default.', () => {
			let person = new Person()
			person.first_name = 'David'

			const N = 15
			const make_article = (id) => {
				let p = new Article(id)
				p.title = 'title_' + id
				p.views = 1000 + id
				return p
			}
			let articles = Array.from(new Array(N), (v, i) => i)
									 .map(make_article)

			return Promise.all(articles.map(p => p.save()))
				.then(psts => {
					person.articles_ids = psts.map(p => p.id)
					return person.save()
				})
				.then(u => u.load_articles('title', 'views'))
				.then(articles => expect(articles.length).to.eql(10))
		})

		it('person.load_articles("title", "views", 5) should not load more than 5 records by default.', () => {
			let person = new Person()
			person.first_name = 'David'

			const N = 15
			const make_article = (i) => {
				let p = new Article(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let articles = Array.from(new Array(N), (v, i) => i)
									 .map(make_article)

			return Promise.all(articles.map(p => p.save()))
				.then(psts => {
					person.articles_ids = psts.map(p => p.id)
					return person.save()
				})
				.then(u => u.load_articles('title', 'views', 5))
				.then(articles => expect(articles.length).to.eql(5))
		})

		it('person.load_articles("views", "title", 20) should not load more than the total number of records currently in the database(15).', () => {
			let person = new Person()
			person.first_name = 'David'

			const N = 15
			const make_article = (i) => {
				let p = new Article(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let articles = Array.from(new Array(N), (v, i) => i)
									 .map(make_article)

			return Promise.all(articles.map(p => p.save()))
				.then(psts => {
					person.articles_ids = psts.map(p => p.id)
					return person.save()
				})
				.then(u => u.load_articles('title', 'views', 20))
				.then(articles => expect(articles.length).to.eql(15))
		})

		it('person.load_articles("title", "views", 5, 3) should load 5 records skipping the first 3', () => {
			let person = new Person()
			person.first_name = 'David'

			const N = 15
			const make_article = (i) => {
				let p = new Article(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let articles = Array.from(new Array(N), (v, i) => i)
									 .map(make_article)

			return Promise.all(articles.map(p => p.save()))
				.then(psts => {
					person.articles_ids = psts.map(p => p.id)
					return person.save()
				})
				.then(u => u.load_articles('title', 'views', 5, 3))
				.then(articles => {
					expect(articles.length).to.eql(5)
					expect(articles[0].id).to.eql(103)
					expect(articles[1].id).to.eql(104)
					expect(articles[2].id).to.eql(105)
					expect(articles[3].id).to.eql(106)
					expect(articles[4].id).to.eql(107)
					expect(articles[0].title).to.eql('title_' + 3)
					expect(articles[1].title).to.eql('title_' + 4)
					expect(articles[2].title).to.eql('title_' + 5)
					expect(articles[3].title).to.eql('title_' + 6)
					expect(articles[4].title).to.eql('title_' + 7)
				})
		})
	}) // describe person.load_articles()

}) // describe habtm

