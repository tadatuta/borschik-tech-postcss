var FREEZE = require('borschik/lib/freeze'),
    base = require('borschik/lib/tech'),
    U = require('borschik/lib/util'),
    PATH = require('path'),

    postcss = require('postcss'),
    imports = require('postcss-import'),
    csswring = require('csswring'),

    reduceFunctionCall = require('reduce-function-call');

const RE_INLINED_CONTENT = /^data:\w+\/[-+\w;]+,/;
const RE_PROTO_URL = /^(\w\+:)?\/\//;

/**
 * Possible techOptions:
 * sourceMap {boolean} generate source map for output file
 * inlineMap {boolean} generate inline source map. Source map will also be inline when borschik output is stdout.
 */
exports.Tech = base.Tech.inherit({

    __constructor: function(opts) {
        this.__base(opts);
        if (opts.techOptions.sourceMap === true) {
            this.sourceMap = true;
            if (!opts.output.path || opts.techOptions.inlineMap === true) {
                this.sourceMap = {inline: true};
            }
        }
    },

    minimize: function(content) {
        return postcss()
            // call minimize processor
            .use(csswring.postcss)
            .process(content, content.opts);
    },

    write: function(output, content) {
        var _this = this;

        return this.__base(output, content.css)
            .then(function() {
                if (_this.sourceMap === true) {
                    return U.writeFile(output.path + '.map', content.map);
                }
            });
    },

    File: exports.File = base.File.inherit({
        process: function(path) {
            return postcss()
                // wrap imports with begin/end comments
                .use(comments())
                // expand imports
                .use(imports({path: PATH.dirname(path)}))
                // rebase links and freeze resources
                .use(links({freeze: this.tech.opts.freeze}))
                .process(this.content, {
                    from: path,
                    to: this.tech.opts.output.path,
                    map: this.tech.sourceMap
                });
        }
    })

});

/**
 * Wraps @import's with begin/end comments
 * @returns {Function}
 */
function comments() {
    return function(styles) {
        styles.eachAtRule(function(rule) {
            if (rule.name !== 'import') {
                return;
            }

            rule.parent.insertBefore(rule, postcss.comment({text: rule.params.toString() + ': begin'}));
            rule.parent.insertAfter(rule, postcss.comment({text: rule.params.toString() + ': end'}));
        });
    }
}

/**
 * Rebases resource urls according to opts.to and opts.from parameters.
 * @param opts
 * @returns {Function}
 */
function links(opts) {
    return function(styles, processOpts) {
        styles.eachDecl(function(decl) {
            if (!decl.value) {
                return;
            }

            var from = processOpts.from ? PATH.dirname(processOpts.from) : '.',
                to = processOpts.to ? PATH.dirname(processOpts.to) : from;

            if (decl.value.indexOf('url(') == -1) {
                return;
            }

            var dir = PATH.dirname(decl.source.file);
            decl.value = reduceFunctionCall(decl.value, 'url', function(value) {
                // value can be within quotes, double quotes or nothing
                // parts will capture optional opening quote, value and optional closing quote
                var parts = value.match(/^(['"]?)([^'"]*)(['"]?)$/),
                    newPath = parts[2];

                if (!RE_INLINED_CONTENT.test(newPath) && !RE_PROTO_URL.test(newPath)) {
                    if (dir !== from) {
                        newPath = PATH.relative(from, dir + PATH.sep + newPath);
                    }
                    newPath = PATH.resolve(from, newPath);
                    newPath = PATH.relative(to, newPath);

                    if (opts.freeze) {
                        newPath = freeze(newPath);
                    }
                }

                return 'url(' + parts[1] + newPath + parts[3] + ')';
            });
        });
    }
}

function freeze(path) {
    var parts = path.match(/^([^?#]+)([?#]?.*)$/),
        url = parts[1];

    if (FREEZE.isFreezableUrl(url)) {
        try {
            return FREEZE.processPath(url) + parts[2];
        } catch (e) {
            // Find all parents for better error message
            var message = [e.message],
                parentFile = this.parent;
            while (parentFile && parentFile.path) {
                message.push('  -> ' + parentFile.path);
                parentFile = parentFile.parent;
            }
            throw new Error(message.join('\n'));
        }
    }

    return path;
}
