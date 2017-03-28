// test_models.js
import RakuOrm from '../src/RakuOrm'

class User extends RakuOrm { }

User.schema = {
	first_name: 'String',
	last_name: 'String',
	username: 'String',
	email: 'String',
	password: 'String',
	habtm: [
			{ model: 'Post',
				method: 'posts' }
		],
  has_many: [
    { model: 'Post',
      method: 'approved_articles'}
    ]
}

class Post extends RakuOrm { }

Post.schema = {
	title: 'String',
	body: 'String',
	views: 'Integer',
	habtm: [
			{ model: 'User',
				method: 'authors',
				inverse_of: 'posts'
			}
		]
}

RakuOrm.init(Post)
RakuOrm.init(User)

export { User, Post }
