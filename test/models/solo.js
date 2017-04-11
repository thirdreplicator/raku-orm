// solo.js
// Models without inverse relationships.

import RakuOrm from '../../src/RakuOrm'

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
  has_one: [
    { model: 'Media',
      method: 'featured_image' 
    }
  ]
}

class Media extends RakuOrm { }

Media.schema = {
  location: 'String',
  attributes: 'String',
}

RakuOrm.init(Media)
RakuOrm.init(Post)
RakuOrm.init(User)

export { User, Post, Media }
