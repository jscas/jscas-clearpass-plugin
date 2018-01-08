# JSCAS Clearpass

This is a plugin for the [JSCAS server][server]. It is used to intercept a
user's credentials as they are logging in and store them in a cache. The cache
is either a Redis or MongoDB database. Therefore, the server must have either
storage mechanism configured. If both are configured then the Redis database
will take precedence.

This plugin exposes a REST API for retrieving the stored credentials.

**Caution:** if you can avoid using this plugin, then you should do so. Caching
a user's credentials, despite them being encrypted before storing, is a
*bad idea*.

But, if you have no choice, then it is ***highly*** recommended that you access
the API via a server-side method, and that you allow only specific servers
to access the API (i.e. apply a very strict incoming firewall).

[server]: https://github.com/jscas/cas-server

## Database Notes

+ Redis: honors the configured `lifetime`. If set to `0`, it is left up to the
administrator to clean up the database.
+ MongoDB: does remove entries after the configured `lifetime`. It is left up
to the administrator to clean up the database. Consider using
[mongo-purge](https://www.npmjs.com/package/mongo-purge) to handle this.

## Configuration

The configuration should be added to the server's configuration under the
plugins configuration section. It should be under the key `clearpass`.

```javascript
{
  encryptionKey: 'at least a 32 character string',
  lifetime: 0,
  authKeys: ['string key']
}
```

The `lifetime` property specifies how long, in milliseconds, a set of stored
credentials should be valid. A setting of `0` indicates that the sealed
credentials are indefinitely valid. You should set this to a reasonably
short time.

The `authKeys` property specifies a set of bearer tokens for clients that
are allowed to query the REST API. There must be at least one key present.

## REST API

All requests to the API must include the `Authorization` header. This
header must contain a valid API key prefixed with `bearer `. Keys can be any
string that are valid for an HTTP header value ([rfc2616 §4.2][rfc2616]).

Example: `Authorization: bearer 123456`.

[rfc2616]: http://tools.ietf.org/html/rfc2616#section-4.2

### `/clearpass/{username}/credentials` GET

Retrieves the given `username`'s credentials. If the credentials are stored,
and nothing is wrong with the request, you will get back a JSON representation
of the object:

```javascript
{
  username: String,
  password: String
}
```

If errors have occurred, you will receive an appropriate HTTP status.

## License

[MIT License](http://jsumners.mit-license.org/)
