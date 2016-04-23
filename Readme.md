# JSCAS Clearpass

This is a plugin for the [JSCAS server][server]. It is used to intercept a
user's credentials as they are logging in, and storing them in a MongoDB
database. As such, this plugin requires the server to have a
[Mongoose][mongoose] instance configured.

This plugin exposes a REST API for retrieving the stored credentials.

**Caution:** if you can avoid using this plugin, then you should do so. Caching
a user's credentials, despite them being encrypted before storing, is a
*bad idea*.

But, if you have no choice, then it is ***highly*** recommended that you access
the API via a server-side method, and that you allow only specific servers
to access the API (i.e. apply a very strict incoming firewall).

[server]: https://github.com/jscas/cas-server
[mongoose]: http://mongoosejs.com/

## Configuration

The configuration should be added to the server's configuration under the
plugins configuration section. It should be under the key `clearpass`.

```javascript
{
  encryptionKey: 'at least a 32 character string'
}
```

## REST API

All requests to the API must include the header `x-clearpass-api-key`. This
header must contain a valid API key. Keys are stored in the MongoDB database
under the `clearpassapikeys` collection. An API key document has the form:

```javascript
{
  owner: String,
  key: String
}
```

Keys can be any string that are valid for an HTTP header value
([rfc2616 §4.2][rfc2616]).

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
