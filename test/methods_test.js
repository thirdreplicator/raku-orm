import Raku from 'raku'
import RakuOrm from '../src/RakuOrm'
import { expect, assert } from 'chai'

const raku = new Raku()

class User extends RakuOrm { }

User.schema = {
	first_name: 'String',
	last_name: 'String',
	username: 'String',
	email: 'String',
	password: 'String',
	has_many: [
			{ method: 'posts',
				model: 'Post',
				key: 'post_ids'}
		],
	habtm: [
			{ method: 'followers',
				model: 'User',
				join: 'followers' }
		]
}

class Post extends RakuOrm { }

Post.schema = {
	title: 'String',
	body: 'String',
	views: 'Integer',
	belongs_to: [
			{ method: 'author',
				key: 'author_id',
				model: 'User',
				observed_keys: 'post_ids' }
		]
}

RakuOrm.init(Post)
RakuOrm.init(User)

describe('instance of <Class> < RakuOrm', () => {
	describe('string attributes', () => {
		// user.first_name
		it('should be able to store a first_name', () => {
			let user = new User()
			expect(user.first_name).to.eql(null)
			user.first_name = 'David'
			expect(user.first_name).to.eql('David')
		})

		// user.last_name
		it('should be able to store a last_name', () => {
			let user = new User()
			expect(user.last_name).to.eql(null)
			user.last_name = 'Beckwith'
			expect(user.last_name).to.eql('Beckwith')
		})

		// user.email
		it('should be able to store an email address', () => {
			let user = new User()
			expect(user.email).to.eql(null)
			user.email = 'thirdreplicator@gmail.com'
			expect(user.get('email')).to.eql('thirdreplicator@gmail.com')
		})
	}) // describe string attributes

	describe('id', () => {
		it('should be able set an id', () => {
			let user = new User()
			expect(user.id).to.eql(null)
			user.id = 42
			expect(user.id).to.eql(42)
		})

	}) // describe id

	describe('load()', () => {
		it('should return a promise', () => {
			let user = new User()
			let promise = user.load()
			return promise
				.then(() => {
					expect(promise.constructor.name).to.eql('Promise')
				})
		})

		it('should load a user attribute', () => {
			let user = new User(501)
			return raku.set('User#501:first_name', 'Roger')
				.then(() => user.load('first_name'))
				.then(() => expect(user.first_name).to.eql('Roger'))
		})
	})

	describe('save()', () => {
		it('should return a promise', () => {
			let user = new User()
			let promise = user.save()
			return promise
				.then(() => {
					expect(promise.constructor.name).to.eql('Promise')
				})
		})

		it('should generate an id if none exists during a call to save()', () => {
			// reset user id to 0
			let user = new User()
			return raku.cset('User:last_id', 0)
				.then(() => {
						expect(user.id).to.eql(null)
						return user.save()
					})
				.then(() => {
					expect(user.id).to.be.a('number')
					expect(user.id).to.eql(1)
				})
		})

		it('should save the attribute to the generated user id during a call to save()', () => {
			// reset user id to 100
			let user = new User()
			return Promise.all([
					raku.cset('User:last_id', 100),
					raku.del('User#101:first_name'),
					raku.del('User#101:last_name')])
				.then(() => {
						expect(user.id).to.eql(null)
						user.first_name = 'David'
						user.last_name = 'Beckwith'
						return user.save()
					})
				.then(user => {
					// in-memory version
					expect(user.id).to.eql(101)
					expect(user.first_name).to.eql('David')
					expect(user.last_name).to.eql('Beckwith')
				})
				.then(() => User.load(101, 'first_name', 'last_name'))
				.then(user101 => {
					// on-disk version
					expect(user101.id).to.eql(101)
					expect(user101.first_name).to.eql('David')
					expect(user101.last_name).to.eql('Beckwith')
				})
		})

		it('should increment the id after each call to save()', () => {
			let user1 = new User()
			let user2 = new User()
			let user3 = new User()

			// reset user id to 0
			return raku.cset('User:last_id', 0)
				.then(() => user1.save())
				.then(user1 => expect(user1.id).to.be.eql(1))
				.then(() => user2.save())
				.then(user2 => expect(user2.id).to.be.eql(2))
				.then(() => user3.save())
				.then(user3 => expect(user3.id).to.be.eql(3))
		})

		it('if the id is already set, save() should not change it', () => {
			let user = new User()
			expect(user.id).to.eql(null)
			user.id = 42
			expect(user.id).to.eql(42)
			return user.save()
				.then(() => expect(user.id).to.eql(42) )
		})

	 it('ids should not overlap even in conditions of high contention', () => {
		 let N = 10
		 let users = Array.from(new Array(N), (v, i) => i)
								 .map(() => new User())
		 return raku.cset('User:last_id', 0)
			 .then(() => Promise.all(users.map(u => u.save())))
			 .then(values => {
				 const user_ids = new Set(values.map(u => u.id))
				 expect(user_ids.size).to.eql(N)
			 })
	 })

		it('if the id is already set to 42, save() should save the changed attributes in the database of User#42', () => {
			let user = new User()
			expect(user.id).to.eql(null)
			user.id = 42
			expect(user.id).to.eql(42)
			expect(user.first_name).to.eql(null)
			user.first_name = 'David'
			return user.save()
				.then(() => expect(user.id).to.eql(42) ) // in memory value
				.then(() => User.load(42, 'first_name'))
				.then(reloaded_user => expect(reloaded_user.first_name).to.eql('David'))
		})
	}) // describe save()

	describe('delete()', () => {
		it("attributes should be null after the instance is deleted", () => {
			let user = new User()
			let user_id = 42
			user.id = user_id
			user.first_name = 'Tom'
			return user.save()
				.then(() => raku.get('User#' + user_id + ':first_name'))
				.then(first_name => expect(first_name).to.eql('Tom'))
				.then(() => { return user.delete() })
				.then((promises) => {
					// values in memory
					expect(user.id).to.be.null
					expect(user.first_name).to.be.null
					expect(user.post_ids).to.eql([])
				})
				.then(() => Promise.all([raku.get('User#' + user_id + ':first_name'), raku.cget('User#' + user_id + ':id')]))
				.then(([first_name, id]) => {
					// values from disk
					expect(id).to.eql(0)
					expect(first_name).to.be.null
				})
		})
	})
}) // describe user instance

describe('counter (integer) attributes', () => {
	describe('Post:views: Number', () => {
		it('the attr should know its type', () => {
			expect(Post.schema.views).to.eql('Integer')
		})

		it ('should be able to store numbers in memory', () => {
			let post = new Post()
			post.views = 500
			expect(post.views).to.eql(500)
		})

		it('should be able to load stored integers from the database', () => {
			return raku.cset('Post:last_id', 0)
				.then(() => (new Post()).save())
				.then(post => expect(post.id).to.eql(1))
				.then(() => raku.cset('Post#1:views', 42))
				.then(() => Post.load(1, 'views'))
				.then(post => expect(post.views).to.eql(42))
		})

		it('should be able to save stored integers into the database', () => {
			let post = new Post()
			return raku.cset('Post:last_id', 0)
				.then(() => {
						post.views = 123
						return post.save()
					})
				.then(() => expect(post.id).to.eql(1))
				.then(() => raku.cget('Post#1:views'))
				.then(num_views => expect(num_views).to.eql(123))
		})
	})

	describe('inc()', () => {
		it('should increment Integer-type attributes', () => {
			let post = new Post()
			return raku.cset('Post:last_id', 300)
				.then(() => post.save())
				.then(() => expect(post.id).to.eql(301))
				.then(() => post.inc('views')) // increment 3 times
				.then(() => post.inc('views'))
				.then(() => post.inc('views'))
				.then(() => Post.load(301, 'views'))
				.then(post => expect(post.views).to.eql(3))
		})
	})
}) // describe counter attributes

describe('RakuOrm static methods', () => {
	describe('RakuOrm.getClass()', () => {
		expect(RakuOrm.getClass('User')).to.eql(User)
		expect(RakuOrm.getClass('Post')).to.eql(Post)
	})
})

describe('has_many relationship', () => {
	describe('user.post_ids', () => {
		it('should return an empty list if there are no posts associated with the user.', () => {
			let user = new User()
			user.first_name = 'David'
			expect(user.post_ids).to.eql([])
		})

		it('user.post_ids = [1, 2, 3] should change the array in memory', () => {
			let user = new User()
			user.first_name = 'David'

			user.post_ids = [4, 10]
			expect(user.post_ids).to.eql([4, 10])
		})
	}) // user.post_ids

	describe('user.save()', () => {
		it('should save backlinks from Posts to the saved user.id', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.post_ids = [542, 1001]

			let post = new Post()
			post.id = 542
			return Promise.all([user.save(), raku.sdel('Post#542:User:post_ids')])
				.then(() => raku.sismember('Post#542:User:post_ids', user.id))
				.then(res => expect(res).to.be.true)
		})
	})

	describe('user.load("post_ids")', () => {
		it('should return a list of all ids if they exist', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.post_ids = [542, 1001]
			return user.save()
				.then(() => {
					return User.load(user.id, 'post_ids', 'first_name')
				})
				.then(user2 => {
					expect(user2.first_name).to.eql('Loader')
					expect(user2.post_ids).to.eql([542, 1001])
				})
		}) // it

		it("Post needs to have a list of incoming foreign keys in User.", () => {
			expect(Post.observed_keys('User').has('post_ids')).to.be.true
		})

		it("deleted posts should be deleted from the user's list of post_ids", () => {
			let user = new User()
			user.first_name = 'Loader'
			user.post_ids = [542, 1001]

			let post = new Post()
			post.id = 542
			return raku.sdel('Post#542:User:post_ids')
				.then(() => user.save())
				.then(() => post.delete())
				.then(() => {
					 return User.load(user.id, 'post_ids')
				 })
				.then(u => expect(u.post_ids).to.eql([1001]))
		})

		it('user.save() should save the back link to that user in the corresponding post\'s instance data.', () => {
			let user = new User()
			user.first_name = 'Loader'
			user.post_ids = [542, 1001]

			let post = new Post(542)
			return raku.sdel('Post#542:User:post_ids')
				.then(() => user.save())
				.then(() => raku.smembers('Post#542:User:post_ids'))
				.then(backlinks => expect(backlinks).to.eql([user.id]))
		})

		it("deleted posts should delete their backlinks to post_ids", () => {
			let user = new User()
			user.post_ids = [542, 1001]

			let post = new Post(542)
			return raku.sdel('Post#542:User:post_ids')
				.then(() => user.save())
				.then(() => post.delete())
				.then(() => raku.smembers('Post#542:User:post_ids'))
				.then(backlinks => expect(backlinks).to.eql([]))
		})

	}) // user.load("post_ids")


	describe('user.posts(...<ATTRIBUTES>, [LIMIT, [OFFSET]])', () => {

		//it('should return a list of posts instances', () => {
		//	let user = new User()
		//	user.first_name = 'David'

		//	let post1 = new Post()
		//	post1.title = 'title1'

		//	let post2 = new Post()
		//	post2.title = 'title2'
		// 
		//	return Promise.all([post1.save(), post2.save()])
		//		.then(([p1, p2]) => {
    //      user.post_ids = [p1.id, p2.id]
    //      return user.save()
    //    })
    //    .then(u => u.posts())
    //    .then(posts => expect(post[0].constructor.name).to.eql('Post'))
		//	
		//})
//
//		it('user.posts() should each instance should have the id property set to a number in the same order as user.post_ids', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts() should not load any attributes except for the id', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("title") should load the title property from the database', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("title", "views") should load the title and views properties from the database', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("title", "views") should not load more than 10 records by default.', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("title", "views", 5) should not load more than 5 records by default.', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("views", "title", 15) should not load more than 15 records by default.', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('user.posts("title", "views", 5, OFFSET) should load 5 records starting from the (OFFSET + 1)th record', () => {
//			assert.fail('To be implemented.')
//		})
	}) // describe user.posts()
}) // describe has_many

//describe('belongs_to methods', () => {
//	describe('post.author_id', () => {
//		it('should be null if not set', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should be assignable', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should be savable to disk', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // describe post.author_id
//
//	describe('post.author = user', () => {
//		it('should change the post.author_id value in memory', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('should change the user.post_ids values in memory to include the new user.id', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.save() should change the post.author_id value on disk', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.save() should change the user.post_ids values on disk', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // describe post.author=
//
//	describe('post.author', () => {
//		it('if not yet loaded, it should be null', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('if already loaded, it should be the User instance from disk', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // post.author
//
//	describe('post.load("author")', () => {
//		it('should return a promise load the associated author', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('the promise should evaluate to the associated author', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('poast.author should have been changed to the loaded value', () => {
//			assert.fail('To be implemented.')
//		})
//
//		it('post.load("title", ["author", "last_name", "email"]) should load the associated author\'s last_name', () => {
//			assert.fail('To be implemented.')
//		})
//	}) // post.load('author')
//})

//describe('habtm methods', () => {
//	// user.followers
//})

			//let post2 = new Post()
			//post2.title = 'title2'

			//return Promise.all([user.save(), post1.save(), post2.save()])
			//	.then(() => {
			//		let post_ids_key = user.attr_key('post_ids')
			//		return raku.set(post_ids_key, [post1.id, post2.id])
			//	})
			//	.then(() => user.load('title', 'post_ids'))
			//	//.then(() => {
			//	//	expect(user.post_ids).to.eql([post1.id, post2.id])
			//	//})
