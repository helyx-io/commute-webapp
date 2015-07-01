////////////////////////////////////////////////////////////////////////////////////
// Documentation
////////////////////////////////////////////////////////////////////////////////////
//
// Activity Stream sample payload:
//{
//	"verb": "post",
//	"published": "2011-02-10T15:04:55Z",
//	"language": "en",
//	"actor": {
//	    "objectType": "person",
//		"id": "urn:example:person:jane",
//		"displayName": "Jane Doe",
//		"url": "http://example.org/jane",
//		"image": {
//		    "url": "http://example.org/jane/image.jpg",
//			"mediaType": "image/jpeg",
//			"width": 250,
//			"height": 250
//	    }
//    },
//	"object" : {
//	    "objectType": "picture",
//		"id": "urn:example:picture:abc123/xyz"
//	    "url": "http://example.org/pictures/2011/02/pic1",
//		"displayName": "Jane jumping into water"
//    },
//	"target" : {
//	    "objectType": "album",
//		"id": "urn:example:albums:abc123",
//		"displayName": "Jane's Vacation",
//		"url": "http://example.org/pictures/albums/janes_vacation/"
//    }
//}
//
//
////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');
var uriTemplates = require('uri-templates');


////////////////////////////////////////////////////////////////////////////////////
// Objects
////////////////////////////////////////////////////////////////////////////////////

var objects = {};

objects.Photo = {
    type: 'photo',
    urn: "urn:commute:photo",
    url: (photoId) => {
        return uriTemplate("/api/photos/{photoId}", {"photoId": photoId});
    },
    verbs: {
        Created: 'CREATED'
    },
    create: (id, legend, url) => {
        return object(
            objects.Photo.urn,
            id,
            legend,
            url
        );
    }
};

objects.Video = {
    type: 'video',
    urn: "urn:commute:video",
    url: (videoId) => {
        return uriTemplate("/api/video/{videoId}", {"videoId": videoId});
    },
    verbs: {
        Created: 'CREATED'
    },
    create: (id, legend, url) => {
        return object(
            objects.Video.urn,
            id,
            legend,
            url
        );
    }
};

objects.Post = {
    type: 'post',
    urn: "urn:commute:post",
    url: (postId) => {
        return uriTemplate("/api/posts/{postId}", {"postId": postId});
    },
    verbs: {
        Created: 'CREATED'
    },
    create: (id, content) => {
        return object(
            objects.Post.urn,
            id,
            content,
            objects.Post.url(id)
        );
    }
};


////////////////////////////////////////////////////////////////////////////////////
// Actors
////////////////////////////////////////////////////////////////////////////////////

var actors = {};

actors.User = {
    type: 'user',
    urn: "urn:commute:user",
    url: (userId) => {
        return uriTemplate("/api/users/{userId}", {"userId": userId});
    },
    verbs: {
        Created: 'CREATED'
    },
    create: (user) => {
        return actor(
            actors.User.urn,
            user.id,
            user.displayName,
            actors.User.url(user.id),
            image('/api/users/${user.id}/avatar.png?w=64&h=64', 'image/png', 64, 64)
        );
    }
};


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var uriTemplate = (uri, params) => {
    return uriTemplates(uri).fill(params);
};

var image = (url, mediaType, width, height) => {
    return {
        url: url,
        mediaType: mediaType,
        width: width,
        height: height
    };
};


var activity = () => {

    var activity = {};

    activity.asModel = () => {

        var model = {
            verb: activity.verb,
            published: activity.published
        };

        if (activity.actor) {
            model.actorObjectType = activity.actor.objectType;
            model.actorId = activity.actor.id;
            model.actorDisplayName = activity.actor.displayName;
            model.actorUrl = activity.actor.url;

            if (activity.actor.image) {
                model.actorImageUrl = activity.actor.image.url;
                model.actorImageMediaType = activity.actor.image.mediaType;
                model.actorImageWidth = activity.actor.image.width;
                model.actorImageHeight = activity.actor.image.height;
            }
        }

        if (activity.object) {
            model.objectType = activity.object.objectType;
            model.objectId = activity.object.id;
            model.objectUrl = activity.object.url;
            model.objectDisplayName = activity.object.displayName;
        }

        if (activity.target) {
            model.targetObjectType = activity.target.objectType;
            model.targetId = activity.target.id;
            model.targetDisplayName = activity.target.displayName;
            model.targetUrl = activity.target.url;
        }

        return model;
    };

    var builder = {};

    builder.get = () => {
        return activity;
    };

    builder.fromModel = (model) => {
        if (model.actorObjectType && model.actorId) {

            var actorImage;

            if (model.actorImageUrl) {
                actorImage = image(
                    model.actorImageUrl,
                    model.actorImageMediaType,
                    model.actorImageWidth,
                    model.actorImageHeight
                );
            }

            builder.actor(
                model.actorObjectType,
                model.actorId,
                model.actorDisplayName,
                model.actorUrl,
                actorImage
            );
        }

        builder.verb(model.verb);

        if (model.objectType && model.objectId) {
            builder.object(
                model.objectType,
                model.objectId,
                model.objectDisplayName,
                model.objectUrl
            );
        }

        if (model.targetObjectType && model.targetObjectId) {
            builder.target(
                model.targetObjectType,
                model.targetId,
                model.targetDisplayName,
                model.targetUrl
            )
        }

        builder.published(model.published);
        builder.elapsed(model.published);

        return builder;
    };

    // Do not use fat arrow with arguments and traceur compiler
    builder.actor = function (objectType, id, displayName, url, image) {
        if (arguments.length == 1) {
            var actor = objectType;
            activity.actor = !arguments[0] ? undefined : actor;
        } else {
            activity.actor = {
                objectType: objectType,
                id: id,
                displayName: displayName,
                url: url,
                image: image
            };
        }

        return builder;
    };

    // Do not use fat arrow with arguments and traceur compiler
    builder.target = function (objectType, id, displayName, url, image) {

        if (arguments.length == 1) {
            var target = objectType;
            activity.target = !arguments[0] ? undefined : target;
        } else {
            activity.target = {
                objectType: objectType,
                id: id,
                displayName: displayName,
                url: url
            };
        }

        return builder;
    };

    // Do not use fat arrow with arguments and traceur compiler
    builder.object = function (objectType, id, displayName, url) {

        if (arguments.length == 1) {
            var object = objectType;
            activity.object = !arguments[0] ? undefined : object;
        } else {
            activity.object = {
                objectType: objectType,
                id: id,
                displayName: displayName,
                url: url
            };
        }

        return builder;
    };

    builder.verb = (verb) => {
        activity.verb = verb;

        return builder;
    };

    builder.publishedNow = () => {
        activity.published = moment().format("YYYY-MM-DDTHH:mm:ss");

        return builder;
    };

    builder.published = (date) => {
        activity.published = moment(date).format("YYYY-MM-DDTHH:mm:ss");

        return builder;
    };

    builder.elapsed = (date) => {
        activity.elapsed = moment(date).fromNow();

        return builder;
    };

    return builder;

};

var actor = (objectType, id, displayName, url, image) => {
    return {
        objectType: objectType,
        id: id,
        displayName: displayName,
        url: url,
        image: image
    };
};

var object = (objectType, id, displayName, url, image) => {
    return {
        objectType: objectType,
        id: id,
        displayName: displayName,
        url: url
    };
};

var target = (objectType, id, displayName, url, image) => {
    return {
        objectType: objectType,
        id: id,
        displayName: displayName,
        url: url
    };
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
    activity: activity,
    image: image,
    actors: actors,
    objects: objects
};