# Raku-ORM

A promise-based ORM for Riak in Node.js using the [raku](https://github.com/thirdreplicator/raku) package as the underlying Riak client.

## Features

* automatic id generation
* instance loading
* dynamic has-many loading methods
* save
* delete

The current version only supports has many relationships, but with just this you should be able to get many-to-many relationships by mutually defining many-to-many relationships on both classes. Please watch for more features coming in 2017.

## TODO (hopefully soon)

* belongs-to methods to retrieve the has-many instance. (e.g. post.author())

## USAGE

```javascript

import 'raku-orm'

// The schema is defined by a javascript plain object, and dynamic getters, setters,
//  and save/load/delete methods are automatically defined on the instances of
//  user-defined classes that inherit from RakuOrm.
class User extends RakuOrm { }
User.schema = {
	first_name: 'String',
	last_name: 'String',
	username: 'String',
	email: 'String',
	password: 'String',
	has_many: [
			{ method: 'favorite_posts',
				model: 'Post',
				key: 'post_ids'}
		]
	}

class Post extends RakuOrm { }
Post.schema = {
	title: 'String',
	body: 'String',
	views: 'Integer',
}

RakuOrm.init(Post)
RakuOrm.init(User)

let user = new User()
user.first_name = 'David'
user.last_name = 'Beckwith'
user.email	'thirdreplicator@gmail.com'

let post1 = new Post(),
    post2 = new Post()

post1.title = 'title1'
post1.body = 'Here is the body.'

post2.title = 'title2'
post2.body = "Isn't this fun?"

// Save the posts to get an id for each.
let promise = Promise.all([post1.save(), post2.save()])
  .then(([p1, p2]) => {
    user.post_ids = [p1.id, p2.id]
    // Save the user.
    return user.save() })
  .then(() => {
    // Load a user from the database.
    let u = new User(user.id)
    return u.load('first_name') 
  })
  .then(u => {
    // Load the first 20 titles of this user.
    // Attributes must be explicitly named for loading otherwise, only the id will be loaded.
    return u.favorite_posts('title', 20)
  })
  .then(posts => {
    // Deleting a post will update the on-disk value of the post_ids.
    posts[0].delete()
  })

```

##Notes:

2017-02-27: post.user() is not yet implemented, but I think I'd like to have pretty soon.

##License

MIT, Enjoy.
