function JObject() {
        let ref = this;
        ref.el  = null;
        ref.$get = id => {
                ref.el = document.getElementById(id);
                return ref;
        };
        ref.$view = tag => {
                ref.el = document.createElement(tag);
                return ref;
        };
        ref.$svg = tag => {
                const namespace = 'http://www.w3.org/2000/svg';
                ref.el = document.createElementNS(namespace, tag);
                ref.set('xmlns', namespace);
                return ref;
        };
        ref.ns = namespace => {
                ref.set('xmlns', namespace);
                return ref;
        };
        ref.set = (k, v) => {
                ref.el.setAttribute(k, v);
                return ref;
        };
        ref.setOne = (k, obj, ok, def) => {
                if (obj.hasOwnProperty(ok)) {
                        ref.el.setAttribute(k, obj[ok]);
                } else if (def !== undefined) {
                        ref.el.setAttribute(k, def);
                }
        };
        ref.attr = attrs => {
                for (let k in attrs) {
                        ref.el.setAttribute(k, attrs[k]);
                }
                return ref;
        };
        ref.style = styles => {
                for (let k in styles) {
                        ref.el.style.setProperty(k, styles[k]);
                }
                return ref;
        };
        ref.styleOne = (k, obj, ok, def) => {
                if (obj.hasOwnProperty(ok)) {
                        ref.el.style.setProperty(k, obj[ok]);
                } else if (def !== undefined) {
                        ref.el.style.setProperty(k, def);
                }
                return ref;
        };
        ref.push = e => {
                ref.el.appendChild(e);
                return ref;
        };
        ref.get = () => ref.el;
        ref.mount = e => {
                e.appendChild(ref.el);
                return ref;
        };
        ref.apply = func => {
                func(ref.el);
                return ref;
        }
}

function JsonViewSvg() {
        let ref     = this;
        ref.root    = null;
        ref.gWidth  = 0;
        ref.gHeight = 0;
        ref.states  = [];
        ref.texts   = [];
        ref.gCtx    = {};

        ref.binder  = callSign => {
                alert(`From [${callSign}]`);
        };

        ref.state = (bias_x, bias_y, scale) => {
                for (let text of ref.texts) {
                        text.el.style.setProperty('zoom', scale);
                }
                for (let state of ref.states) {
                        if (state.type.toLowerCase() === 'div') {
                                state.el.style.setProperty('width', `${state.width * scale}px`);
                                state.el.style.setProperty('height', `${state.height * scale}px`);
                                continue;
                        }
                        state.el.setAttribute('x', bias_x + state.x * scale);
                        state.el.setAttribute('y', bias_y + state.y * scale);
                        state.el.setAttribute('width', state.width * scale);
                        state.el.setAttribute('height', state.height * scale);
                        if (state.type === 'rect') {
                                if (state.radius !== 0) {
                                        state.el.setAttribute('rx', state.radius * scale);
                                        state.el.setAttribute('ry', state.radius * scale);
                                }
                                if (state.border !== 0) {
                                        state.el.setAttribute('stroke-width', state.border * scale);
                                }
                        }
                }
        };

        ref.parse = (root, proto) => {
                ref.texts.splice(0, ref.texts.length);
                ref.states.splice(0, ref.states.length);
                ref.root = root;
                if (proto['ViewType'] === 'AbsoluteLayout') {
                        ref.gWidth  = parseInt(proto['width']);
                        ref.gHeight = parseInt(proto['height']);
                        for (let child of proto.children) {
                                ref.create(child);
                        }
                        return ref;
                }
                throw new Error('Svg only support [AbsoluteLayout]!');
        };

        ref.context = ctx => {
                ref.gCtx = ctx;
        };

        ref.create = (proto) => {
                let type = proto['ViewType'];
                let isView = type.slice(-4) === 'View';
                if (isView) {
                        let viewName = type.slice(0, -4);
                        if (viewName === 'Text') {
                                ref.createTextView(proto);
                        } else if (viewName === 'Image') {
                                ref.createImageView(proto);
                        } else if (viewName === 'Button') {
                                ref.createButtonView(proto);
                        } else if (viewName === '') {
                                ref.createView(proto);
                        }
                        return;
                }
                throw new Error(`Unknown view type(${type})!`);
        };

        ref.createTextView = (attr) => {
                let group = new JObject()
                    .$svg('g')
                    .mount(ref.root)
                    .get()
                ;
                let view = new JObject()
                    .$svg('rect')
                    .attr(ref.GetBox(attr))
                    .apply(el => ref.SetBox(el, attr))
                    .mount(group)
                    .get()
                ;
                ref.states.push(ref.genState(view, attr));
                let foreign = new JObject()
                    .$svg('foreignObject')
                    .attr(ref.GetBox(attr))
                    .attr({"pointer-events": "none"})
                    .mount(group)
                    .get()
                ;
                ref.states.push(ref.genState(foreign, attr));
                let outer = new JObject()
                    .$view('div')
                    .style({
                            'width' : `${ref.GetNum('width' , attr, '0')}px`,
                            'height': `${ref.GetNum('height', attr, '0')}px`,
                            'display': 'flex',
                    })
                    .apply(el => {
                            attr.hasOwnProperty('AlignHorizontal')
                                ? el.style.setProperty('justify-content', ref.FlexAlign(attr.AlignHorizontal))
                                : el.style.setProperty('justify-content', 'center')
                            ;
                            attr.hasOwnProperty('AlignVertical')
                                ? el.style.setProperty('align-items', ref.FlexAlign(attr.AlignHorizontal))
                                : el.style.setProperty('align-items', 'center')
                            ;
                    })
                    .mount(foreign)
                    .get()
                ;
                ref.states.push(ref.genState(outer, attr))
                let inner = new JObject()
                    .$view('div')
                    .style({
                            'display': 'inline-block',
                            'zoom': 1,
                            'overflow-wrap': 'normal',
                            'user-select': 'none',
                    })
                    .styleOne('color', attr, 'color', 'rgb(220,220,220)')
                    .styleOne('font-weight', attr, 'FontWeight')
                    .styleOne('font-family', attr, 'FontFamily')
                    .styleOne('font-style', attr, 'FontStyle')
                    .apply(el => {
                            el.style.setProperty('font-size', `${ref.GetNum('FontSize', attr, '12')}px`);
                            if (ref.gCtx.hasOwnProperty(attr.text)) {
                                    el.innerText = ref.gCtx[attr.text];
                            } else {
                                    el.innerText = attr.text;
                            }
                    })
                    .mount(outer)
                    .get()
                ;
                ref.texts.push({
                        el: inner,
                        zoom: 1,
                });
        };
        ref.createImageView = (attr) => {
                let image = new JObject()
                    .$svg('image')
                    .set('href', attr.source)
                    .attr(ref.GetBox(attr))
                    .apply(el => ref.SetBox(el, attr))
                    .mount(ref.root)
                    .get()
                ;
                ref.states.push(ref.genState(image, attr));
        };
        ref.createView = (attr) => {
                let view = new JObject()
                    .$svg('rect')
                    .attr(ref.GetBox(attr))
                    .apply(el => ref.SetBox(el, attr))
                    .mount(ref.root)
                    .get()
                ;
                ref.states.push(ref.genState(view, attr));
        };

        ref.createButtonView = (attr) => {
                if (attr.hasOwnProperty('BackgroundImage')) {
                        let image = new JObject()
                            .$svg('image')
                            .set('href', attr.BackgroundImage)
                            .attr(ref.GetBox(attr))
                            .apply(el => {
                                    ref.SetBox(el, attr);
                                    ref.BindClick(el, attr);
                            })
                            .mount(ref.root)
                            .get()
                        ;
                        ref.states.push(ref.genState(image, attr));
                } else {
                        let view = new JObject()
                            .$svg('rect')
                            .attr(ref.GetBox(attr))
                            .apply(el => {
                                    ref.SetBox(el, attr);
                                    ref.BindClick(el, attr);
                            })
                            .mount(ref.root)
                            .get()
                        ;
                        ref.states.push(ref.genState(view, attr));
                }
        };

        ref.genState = (el, attr) => {
                return {
                        type: el.tagName,
                        el,
                        x: ref.GetNum('x', attr, '0'),
                        y: ref.GetNum('y', attr, '0'),
                        width : ref.GetNum('width', attr, '0'),
                        height: ref.GetNum('height', attr, '0'),
                        radius: attr.hasOwnProperty('radius') ? parseFloat(attr.radius) : 0,
                        border: attr.hasOwnProperty('border') ? parseFloat(attr.border.split(' solid ')[0].trim()) : 0,
                };
        };

        ref.GetNum = (key, opt, def) => opt.hasOwnProperty(key) ? parseFloat(opt[key]) : parseFloat(def);
        ref.GetBox = opt => ({
                x: ref.GetNum('x', opt, '0'),
                y: ref.GetNum('y', opt, '0'),
                width: ref.GetNum('width', opt, '0'),
                height: ref.GetNum('height', opt, '0'),
        });
        ref.SetBox = (view, attr) => {
                ref.SetBorder(view, attr);
                ref.SetRadius(view, attr);
                ref.SetBackgroundColor(view, attr);
        };

        ref.FlexAlign = (type) => {
                if (type === 'start') {
                        return 'flex-start';
                } else if (type === 'end') {
                        return 'flex-end';
                } else {
                        return 'center';
                }
        };
        ref.SetRadius = (obj, options) => {
                if (options.hasOwnProperty('radius')) {
                        obj.setAttribute('rx', parseFloat(options.radius));
                        obj.setAttribute('ry', parseFloat(options.radius));
                }
        };
        ref.SetBorder = (obj, options) => {
                if (options.hasOwnProperty('border')) {
                        let borderArray = options.border.split(' solid ');
                        obj.setAttribute('stroke', borderArray[1]);
                        obj.setAttribute('stroke-width', parseFloat(borderArray[0]));
                }
        };
        ref.SetBackgroundColor = (obj, options) => {
                if (options.hasOwnProperty('BackgroundColor')) {
                        obj.setAttribute('fill', options.BackgroundColor);
                } else {
                        obj.setAttribute('fill', 'rgba(0,0,0,0)');
                }
        };
        ref.BindClick = (obj, options) => {
                if (options.hasOwnProperty('click')) {
                        obj.style.cursor = 'pointer';
                        obj.addEventListener('click', () => {
                                if (ref.binder !== null) {
                                        try {
                                                ref.binder(options['click']);
                                        } catch (e) {
                                                console.error(e);
                                        }
                                }
                        })
                }
        };
}

let coder = document.getElementById('coder');
coder.value = '{\n' +
    '    "ViewType":"AbsoluteLayout",\n' +
    '    "width": "400px",\n' +
    '    "height": "380px",\n' +
    '    "children":[\n' +
    '        {\n' +
    '            "ViewType":"View",\n' +
    '            "x":"0px",\n' +
    '            "y":"0px",\n' +
    '            "width":"400px",\n' +
    '            "height":"380px",\n' +
    '            "BackgroundColor":"#FFFFFF",\n' +
    '            "border":"0.5px solid rgb(0,0,0)"\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"TextView",\n' +
    '            "x":"5px",\n' +
    '            "y":"15px",\n' +
    '            "radius":"5px",\n' +
    '            "text":"Pet",\n' +
    '            "color":"#333333",\n' +
    '            "width":"50px",\n' +
    '            "height":"30px",\n' +
    '            "AlignHorizontal":"center",\n' +
    '            "FontFamily":"Times New Roman",\n' +
    '            "FontSize":28\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"ImageView",\n' +
    '            "x":"0px",\n' +
    '            "y":"40px",\n' +
    '            "width":"400px",\n' +
    '            "height":"260px",\n' +
    '            "source":"img/dog.jpg"\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"TextView",\n' +
    '            "x":"100px",\n' +
    '            "y":"120px",\n' +
    '            "radius":"5px",\n' +
    '            "text":"Beagle",\n' +
    '            "color":"#FFFFFF",\n' +
    '            "width":"200px",\n' +
    '            "height":"100px",\n' +
    '            "AlignHorizontal":"center",\n' +
    '            "FontFamily":"Times New Roman",\n' +
    '            "FontWeight":"bold",\n' +
    '            "FontSize":28\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"ButtonView",\n' +
    '            "x":"364px",\n' +
    '            "y":"15px",\n' +
    '            "width":"30px",\n' +
    '            "height":"30px",\n' +
    '            "BackgroundImage":"img/light.png",\n' +
    '            "click":"fn_light"\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"ButtonView",\n' +
    '            "x":"5px",\n' +
    '            "y":"295px",\n' +
    '            "width":"30px",\n' +
    '            "height":"30px",\n' +
    '            "BackgroundImage":"img/map.png",\n' +
    '            "click":"getMap"\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"ButtonView",\n' +
    '            "x":"365px",\n' +
    '            "y":"295px",\n' +
    '            "width":"30px",\n' +
    '            "height":"30px",\n' +
    '            "BackgroundImage":"img/heart.png",\n' +
    '            "click":"fn_heart"\n' +
    '        },\n' +
    '        {\n' +
    '            "ViewType":"TextView",\n' +
    '            "x":"5px",\n' +
    '            "y":"330px",\n' +
    '            "text":"Lovely little dog. We plan to adopt one.",\n' +
    '            "color":"#333333",\n' +
    '            "width":"390px",\n' +
    '            "height":"40px",\n' +
    '            "AlignHorizontal":"start",\n' +
    '            "AlignVertical":"center",\n' +
    '            "FontFamily":"Times New Roman",\n' +
    '            "FontSize":18\n' +
    '        }\n' +
    '    ]\n' +
    '}';
let cdm = CodeMirror.fromTextArea(
    coder,
    {
        mode: "javascript",
        lineNumbers: true,
        theme: "darcula",
        tabSize: 2,
        height: "800px",
    }
);

let renderButton = document.getElementById('render');
renderButton.addEventListener('click', () => {
        let proto = cdm.getValue();
        try {
                proto = JSON.parse(proto);
        } catch (e) {
                alert('Json syntax error!');
                return;
        }
        try {
                new JsonViewSvg().parse(document.getElementById('shower'), proto);

                let notifier = document.getElementById('notifier');
                notifier.style.display = 'inline-block';
                notifier.innerText = `Rendering ${new Date().toISOString().substr(0, 19)}!`;
                setTimeout(() => {
                        notifier.style.display = 'none';
                }, 3000);
        } catch (e) {
                alert('Viewer parsing error! ' + e.toString());
        }
});

renderButton.click();
// new Ajax().get('channel/measure?view=linearCard').then(resp => {
//     console.info(resp);
//     JsonView.parse('app', JSON.parse(resp));
// });

// new Ajax().get('channel/measure?view=MySQL').then(resp => {
//
//     new JObject().$svg('svg').style({width: '400px', height: '380px'}).mount(document.getElementById(''))
//
//     let svg = $SvgView('svg');
//     $get('app2').appendChild(svg);
//     svg.id = 'app2svg';
//     Style(svg, {width: '400px', height: '380px',});
//     JsonViewSvg.parse('app2svg', JSON.parse(resp));
// });