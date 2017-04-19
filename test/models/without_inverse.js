// without_inverse.js
// Models without inverse relationships.

import RakuOrm from '../../src/RakuOrm'

class Person extends RakuOrm { }
class Article extends RakuOrm { }
class Picture extends RakuOrm { }

Person.schema = {
	first_name: 'String',
	last_name: 'String',
	username: 'String',
	email: 'String',
	password: 'String',
	habtm: [
			{ model: 'Article',
				method: 'articles' }
		],
  has_many: [
    { model: 'Article',
      method: 'approved_articles'}
    ]
}


Article.schema = {
	title: 'String',
	body: 'String',
	views: 'Integer',
  has_one: [
    { model: 'Picture',
      method: 'featured_image' 
    }
  ]
}


Picture.schema = {
  location: 'String',
  attributes: 'String',
}

RakuOrm.init(Person)
RakuOrm.init(Article)
RakuOrm.init(Picture)

export { Person, Article, Picture }
