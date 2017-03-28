// habtm_test.js
import { expect, assert } from 'chai'

import RakuOrm from '../../src/RakuOrm'
import { User, Post } from '../test_models'
import { expectSetEquality } from '../helpers'

import Raku from 'raku'
const raku = new Raku()

describe('habtm relationship', () => {
  beforeEach(() => raku.deleteAll())

	describe('user.posts_ids', () => {
		it('should return an empty list if there are no posts associated with the user.', () => {
			let user = new User()
			user.first_name = 'David'
			expect(user.posts_ids).to.eql([])
		})

		it('user.posts_ids = [1, 2, 3] should change the array in memory', () => {
			let user = new User()
			user.first_name = 'David'

			user.posts_ids = [4, 10]
			expect(user.posts_ids).to.eql([4, 10])
		})
	}) // user.posts_ids

	describe('user.save()', () => {
		it('should save backlinks from Posts to the saved user.id', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.posts_ids = [542, 1001]

			let post = new Post()
			post.id = 542
			return Promise.all([user.save()])
				.then(() => raku.sismember('Post#542:authors_ids', user.id))
				.then(res => expect(res).to.be.true)
		})

		it('should remove backlinks that previously existed', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.posts_ids = [542, 1001]

			return user.save()
				.then(() => raku.sismember('Post#542:authors_ids', user.id))
				.then(res => expect(res).to.be.true)
        .then(() => {
          user.posts_ids = [5, 1001]
          return user.save()
        }) 
				.then(() => raku.sismember('Post#542:authors_ids', user.id))
				.then(res => expect(res).to.be.false)
   
		})
	})

	describe('user.load("posts_ids")', () => {
		it('should return a list of all ids if they exist', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.posts_ids = [542, 1001]
			return user.save()
				.then(() => {
					return User.load(user.id, 'posts_ids', 'first_name')
				})
				.then(user2 => {
					expect(user2.first_name).to.eql('Loader')
					expect(user2.posts_ids).to.eql([542, 1001])
				})
		}) // it

		it("Post needs to have a list of incoming foreign keys in User.", () => {
			expect(Post.observed_keys('User').has('posts_ids')).to.be.true
		})

		it("deleted posts should be deleted from the user's list of posts_ids", () => {
			let user = new User()
			user.first_name = 'Loader'
			user.posts_ids = [542, 1001]

			let post = new Post()
			post.id = 542
			return raku.sdel('Post#542:User:posts_ids')
				.then(() => user.save())
				.then(() => post.delete())
				.then(() => {
					 return User.load(user.id, 'posts_ids')
				 })
				.then(u => expect(u.posts_ids).to.eql([1001]))
		})

		it('user.save() should save the back link to that user in the corresponding post\'s instance data.', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.posts_ids = [542, 1001]

			return raku.sdel('Post#542:authors_ids')
				.then(() => user.save())
				.then(() => raku.smembers('Post#542:authors_ids'))
				.then(backlinks => expect(backlinks).to.eql([user.id]))
		})

		it("deleted posts should delete their backlinks to posts_ids", () => {
			let user = new User()
			user.posts_ids = [542, 1001]
			let post = new Post(542)

			return raku.sdel('Post#542:authors_ids')
				.then(() => user.save())
				.then(() => post.delete())
				.then(() => raku.smembers('Post#542:authors_ids'))
				.then(backlinks => expect(backlinks).to.eql([]))
		})
	}) // user.load("posts_ids")

	describe('user.posts(...<ATTRIBUTES>, [LIMIT, [OFFSET]])', () => {

		it('should return a list of posts instances', () => {
			let user = new User()
			user.first_name = 'David'

			let post1 = new Post()
			post1.title = 'title1'

			let post2 = new Post()
			post2.title = 'title2'
		 
			return Promise.all([post1.save(), post2.save()])
				.then(([p1, p2]) => {
					expect([post1.id, post2.id]).to.eql([p1.id, p2.id])
					user.posts_ids = [p1.id, p2.id]
					return user.save()
				})
				.then(u => u.posts())
				.then(posts => {
					expect(posts[0].constructor.name).to.eql('Post')
					expect(posts[1].constructor.name).to.eql('Post')
				})
			
		})

		it('user.posts() should each instance should have the id property set to a number in the same order as user.posts_ids', () => {
			let user = new User()
			user.first_name = 'David'

			let post1 = new Post()
			post1.title = 'title1'

			let post2 = new Post()
			post2.title = 'title2'
		 
			return Promise.all([post1.save(), post2.save()])
				.then(([p1, p2]) => {
					user.posts_ids = [p1.id, p2.id]
					return user.save()
				})
				.then(u => u.posts())
				.then(posts => {
					expectSetEquality(posts.map(p => p.id), [post1.id, post2.id])
				})
		})

		it('user.posts() (with no arguments) should not load any attributes except for the id', () => {
			let user = new User()
			user.first_name = 'David'

			let post1 = new Post()
			post1.title = 'title1'

			let post2 = new Post()
			post2.title = 'title2'
		 
			return Promise.all([post1.save(), post2.save()])
				.then(([p1, p2]) => {
					user.posts_ids = [p1.id, p2.id]
					return user.save()
				})
				.then(u => u.posts())
				.then(posts => {
          posts.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
					expect(posts[0].title).to.eql(null)
					expect(posts[0].body).to.eql(null)
					expect(posts[0].views).to.eql(0)
					expect(posts[1].title).to.eql(null)
					expect(posts[1].body).to.eql(null)
					expect(posts[1].views).to.eql(0)
				})
		})

		it('user.posts("title") should load the title property from the database', () => {
			let user = new User()
			user.first_name = 'David'

			let post1 = new Post()
			post1.title = 'title1'

			let post2 = new Post()
			post2.title = 'title2'
		 
			return Promise.all([post1.save(), post2.save()])
				.then(([p1, p2]) => {
					user.posts_ids = [p1.id, p2.id]
					return user.save()
				})
				.then(u => u.posts('title'))
				.then(posts => {
          posts.sort((a, b) => a.title.localeCompare(b.title))
					expect(posts[0].title).to.eql('title1')
					expect(posts[0].body).to.eql(null)
					expect(posts[0].views).to.eql(0)
					expect(posts[1].title).to.eql('title2')
					expect(posts[1].body).to.eql(null)
					expect(posts[1].views).to.eql(0)
				})
		})

		it('user.posts("title", "views") should load the title and views properties from the database', () => {
			let user = new User()
			user.first_name = 'David'

			let post1 = new Post()
			post1.title = 'title1'
			post1.views = 828

			let post2 = new Post()
			post2.title = 'title2'
			post2.views = 239		 

			return Promise.all([post1.save(), post2.save()])
				.then(([p1, p2]) => {
					user.posts_ids = [p1.id, p2.id]
					return user.save()
				})
				.then(u => u.posts('title', 'views'))
				.then(posts => {
          posts.sort((a, b) => a.title.localeCompare(b.title))
					expect(posts[0].title).to.eql('title1')
					expect(posts[0].body).to.eql(null)
					expect(posts[0].views).to.eql(828)
					expect(posts[1].title).to.eql('title2')
					expect(posts[1].body).to.eql(null)
					expect(posts[1].views).to.eql(239)
				})
		})

		it('user.posts("title", "views") should not load more than 10 records by default.', () => {
			let user = new User()
			user.first_name = 'David'

			const N = 15
			const make_post = (id) => {
				let p = new Post(id)
				p.title = 'title_' + id
				p.views = 1000 + id
				return p
			}
			let posts = Array.from(new Array(N), (v, i) => i)
									 .map(make_post)

			return Promise.all(posts.map(p => p.save()))
				.then(psts => {
					user.posts_ids = psts.map(p => p.id)
					return user.save()
				})
				.then(u => u.posts('title', 'views'))
				.then(posts => expect(posts.length).to.eql(10))
		})

		it('user.posts("title", "views", 5) should not load more than 5 records by default.', () => {
			let user = new User()
			user.first_name = 'David'

			const N = 15
			const make_post = (i) => {
				let p = new Post(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let posts = Array.from(new Array(N), (v, i) => i)
									 .map(make_post)

			return Promise.all(posts.map(p => p.save()))
				.then(psts => {
					user.posts_ids = psts.map(p => p.id)
					return user.save()
				})
				.then(u => u.posts('title', 'views', 5))
				.then(posts => expect(posts.length).to.eql(5))
		})

		it('user.posts("views", "title", 20) should not load more than the total number of records currently in the database(15).', () => {
			let user = new User()
			user.first_name = 'David'

			const N = 15
			const make_post = (i) => {
				let p = new Post(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let posts = Array.from(new Array(N), (v, i) => i)
									 .map(make_post)

			return Promise.all(posts.map(p => p.save()))
				.then(psts => {
					user.posts_ids = psts.map(p => p.id)
					return user.save()
				})
				.then(u => u.posts('title', 'views', 20))
				.then(posts => expect(posts.length).to.eql(15))
		})

		it('user.posts("title", "views", 5, 3) should load 5 records skipping the first 3', () => {
			let user = new User()
			user.first_name = 'David'

			const N = 15
			const make_post = (i) => {
				let p = new Post(100+i)
				p.title = 'title_' + i
				p.views = 1000 + i
				return p
			}
			let posts = Array.from(new Array(N), (v, i) => i)
									 .map(make_post)

			return Promise.all(posts.map(p => p.save()))
				.then(psts => {
					user.posts_ids = psts.map(p => p.id)
					return user.save()
				})
				.then(u => u.posts('title', 'views', 5, 3))
				.then(posts => {
					expect(posts.length).to.eql(5)
					expect(posts[0].id).to.eql(103)
					expect(posts[1].id).to.eql(104)
					expect(posts[2].id).to.eql(105)
					expect(posts[3].id).to.eql(106)
					expect(posts[4].id).to.eql(107)
					expect(posts[0].title).to.eql('title_' + 3)
					expect(posts[1].title).to.eql('title_' + 4)
					expect(posts[2].title).to.eql('title_' + 5)
					expect(posts[3].title).to.eql('title_' + 6)
					expect(posts[4].title).to.eql('title_' + 7)
				})
		})
	}) // describe user.posts()

  describe('habtm inverse_of', () => {
    it('given a post, it should return the authors', () => {
      let post = new Post()
      post.title = 'the_title'

      let user_names = ['David', 'Valerie', 'Tom', 'Obama'] 
      let authors = ['David', 'Valerie', 'Tom']

      return post.save()      
        .then(() => Promise.all(user_names.map(name => {
                let user = new User()
                user.first_name = name
                if (name != 'Obama') {
							 	 user.posts_ids = [post.id]
                }
                return user.save()
				      })))
        .then(_ => post.authors('first_name'))
        .then(users => expectSetEquality(users.map(u => u.first_name), authors))
    }) // it
  }) // describe habtm inverse_of
}) // describe habtm

