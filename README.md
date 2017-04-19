# Raku-ORM

A promise-based ORM for Riak in Node.js using the [raku](https://github.com/thirdreplicator/raku) package as the underlying Riak client. The current version supports habtm and has-many/belongs-to, and has-one relationships with and without inverses.

## Features

* automatic integer id generation per class, stored and incremented as a CRDT counter
* instance loading (must specify attributes to be loaded)
* dynamic has-and-belongs-to-many ("habtm" a.k.a "many-to-many") loading methods
* dynamic has-many and belongs-to loading methods (belongs-to class methods have at most one association)
* inverse relationships (track which relationship is the inverse of the other).
* saves each attribute separately to avoid accidental saving of large attributes (e.g. a article body).
* delete updates references in related associations.


## USAGE (please see tests for more details)

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
		],
  has_many: [
			{ method: 'approved_articles',
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
  ],
  belongs_to: [
    { model: 'User',
      method: 'approver',
      inverse_of: 'approved_articles'
  ]
}

RakuOrm.init(Post)
RakuOrm.init(User)

let user = new User()
user.first_name = 'David'
user.last_name = 'Beckwith'
user.email	'thirdreplicator@gmail.com'

let approver = new User()
approver.first_name = 'Valerie'
await approver.save()

let post1 = new Post(),
    post2 = new Post()

post1.title = 'title1'
post1.body = 'Here is the body.'
post1.approver_id = approver.id

post2.title = 'title2'
post2.body = "Isn't this fun?"
post2.approver_id = approver.id

// Save the posts to get an id for each.
let promise = Promise.all([post1.save(), post2.save()])
  .then(([p1, p2]) => {
    user.posts_ids = [p1.id, p2.id]
    await p1.load_approver('first_name').first_name // Valerie

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
    return u.load_favorite_posts('title', 20)
  })
  .then(posts => {
    // Deleting a post will update the on-disk value of the post_ids.
    await posts[0].delete()

    // The following is an example that will return an array of users who favorited this post.
    return posts[1].load_who_favorited('first_name') 
  })

```

## TODO
* add a getter/setter for holding loaded associations.
* allow assignment by assigning the association's setter method.
* has-one
* refactor meta-data to store indexes in parent class
* generalize management of double-indexes

## Notes:

2017-04-04: has_many and belongs_to is implemented.
            MAJOR CHANGE in API: to load associations, instead of "user.posts()", "user.load_posts()", this is to make room for an upcoming getter/setter which
            will allow us to store the results of loaded associations.  E.g. user.posts == [ User(1), User(2), ...etc. ]
2017-03-28: inverse habtm relationships are now implemented.
2017-02-27: post.load_users() (inverse has-many relationship) is not yet implemented.

##License

MIT, Enjoy.
