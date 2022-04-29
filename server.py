import json
import logging
import argparse
from tornado.web import Application, StaticFileHandler, RequestHandler
from tornado.ioloop import IOLoop
from tornado.httpserver import HTTPServer


def arg_help():
    usage = """server -p port -c cfg
    -P port : http binding port.
    -p path  : settings file.
    -h      : show this help message."""
    parser = argparse.ArgumentParser(usage="view_provider -P port -p path")
    parser.add_argument('-p', '--path', required=True, help='static file path')
    parser.add_argument('-P', '--port', required=True, help='port of http')
    return parser.parse_args()


args = arg_help()
view_cache = {}


class MeasureChannelHandler(RequestHandler):
    def get(self):
        view = self.get_query_argument('view')
        if view in view_cache:
            logging.info('[Cache] %s' % view)
            resp = view_cache[view]
        else:
            try:
                fp = open('%s/view/%s.json' % (args.path, view), 'r+')
                resp = json.loads(fp.read())
                view_cache[view] = resp
            except Exception as e:
                resp = {
                    'code': 501,
                    'message': str(e)
                }
        logging.info("view[%s]: %s" % (view, json.dumps(resp)))
        return self.write(resp)

    def post(self):
        try:
            req = json.loads(self.request.body.decode(encoding='UTF-8'))
            logging.info(req)
            resp = {
                'code': 200,
            }
        except Exception as e:
            logging.error(str(e))
            resp = {
                'code': 501,
                'message': str(e)
            }
        return self.write(resp)


class Service:
    _port = 8080
    _service_name = "general service"
    _version = "v0.1"

    def __init__(self, **kwargs):
        self._port = kwargs['port'] if 'port' in kwargs else self._port
        self._service_name = kwargs['service_name'] if 'service_name' in kwargs else self._service_name
        self._version = kwargs['version'] if 'version' in kwargs else self._version

    def start(self, urls: list, pth: str):
        HTTPServer(Application(urls, static_path=pth)).listen(self._port)
        IOLoop.current().start()


def main():
    logging.basicConfig(
        format='%(asctime)s [%(threadName)s] [%(name)s] [%(levelname)s] %(filename)s[line:%(lineno)d] %(message)s',
        level=logging.INFO
    )
    pth = "/opt/jpro/JsonTree"
    urls = [
        (r"/channel/measure", MeasureChannelHandler),
        (r'^/(.*?)$', StaticFileHandler, {"path": pth, "default_filename": "index.html"},),
    ]
    http = Service(port=args.port, service_name="Json View Service", version="v0.1")
    http.start(urls, pth)


if __name__ == '__main__':
    main()
