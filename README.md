# Raku-ORM

A promise-based ORM for Riak in Node.js using the [raku](https://github.com/thirdreplicator/raku) package as the underlying Riak client.

## Features

* automatic integer id generation per class, stored as a CRDT counter
* instance loading (must specify attributes to be loaded)
* dynamic has-and-belongs-to-many ("habtm" or many-to-many) loading methods
* save
* delete
* inverse relationships (track which relationship is the inverse of the other).

The current version only supports habtm (many-to-many) relationships.

## TODO

* has-many / belongs-to
* has-one

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
	habtm: [
			{ method: 'favorite_posts', // 'favorite_posts_ids'  is authomatically created.
				model: 'Post' }
		]
	}

class Post extends RakuOrm { }
Post.schema = {
	title: 'String',
	body: 'String',
	views: 'Integer',
  habtm: [
    { model: 'User',
      method: 'who_favorited', // 'who_favorited_ids' is automatically created.
      inverse_of: 'favorite_posts' }
  ]
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
    user.posts_ids = [p1.id, p2.id]
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

		// The inverse of user.posts() is post.users()
    // The following is an example that will return an array of users who favorited this post.
    return posts[1].who_favored('first_name') 
  })

```

##Notes:

2017-03-28: inverse habtm relationships are now implemented.
2017-02-27: post.user() (inverse has-many relationship) is not yet implemented.

##License

MIT, Enjoy.
