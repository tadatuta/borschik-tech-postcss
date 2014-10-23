borschik-tech-postcss
======================

Tech module for [borschik](http://github.com/bem/borschik) which processes the css files like
standard borschik `css` tech with additional source map generation feature. So after processing
your `css` file with `@import` directives you will get new `css` with the imports expanded and a
source map file which describes mapping between the tokens positions in generated file and its
sources.

All processing is done using [postcss](https://github.com/postcss/postcss). Imports are expanded
using [postcss-import](https://github.com/postcss/postcss-import) plugin. CSS minimization is done
using [csswring](https://github.com/hail2u/node-csswring) plugin.

Usage
-----

First you should install `borschik` and this module into your project and save it into `package.json`

    npm install borschik borschik-tech-postcss --save

Then you could run `borschik`

    ./node_modules/.bin/borschik --tech postcss -i your.css --o your.min.css
    
Source map generation is enabled by default. In the case above it will be written to your.min.css.map.
When output is a stream (stdout) the source map will be embedded into css content as a comment pragma.
For example:
```
//# sourceMappingURL=data:application/json;base64, ...
```
    
**Options**

You can disable source map generation using `sourceMap` tech option. For example:

```
./node_modules/.bin/borschik --tech istanbul -i your.css -o your.min.css --tech-options '{"sourceMap": false}'
```

You can force to embed source map into file by specifying the `inlineMap` tech option. For example:

```
./node_modules/.bin/borschik --tech istanbul -i your.css -o your.min.css --tech-options '{"inlineMap": true}'
```


License
-------

See [MIT](LICENSE) LICENSE.
