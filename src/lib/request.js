/**
 * Created by zhengzhaowei on 2018/3/5.
 */
import param from 'jquery-param';
import PubSub from 'pubsub-js';
let uuid = require('node-uuid');

export default class Request {

    contentType = {
        form: 'application/x-www-form-urlencoded',
        json: 'application/json',
        html: 'text/html',
        css: 'text/css',
        js: 'application/x-javascript'
    };

    config = {
        cross: false,           //是否跨域
        root: '',               //根地址
        baseUrl: '',            //基地址
        dataType: 'json',       //请求数据类型
        responseType: 'json',   //应答数据类型
        headers: {},
    };

    constructor(config = {}) {
        this.key = uuid.v4();
        this.setConfig(config);
    }

    getRoot() {
        return this.config.root;
    }

    setBaseUrl(baseUrl) {
        this.config({baseUrl: baseUrl});
        return this;
    }

    getBaseUrl() {
        return this.config.baseUrl;
    }

    /**
     * 设置是否跨域
     * @param bool
     */
    setCross(bool) {
        this.setConfig({cross: bool});
        return this;
    }

    /**
     * 设置配置数据
     * @param config
     */
    setConfig(config) {
        Object.assign(this.config, config);
        return this;
    }

    /**
     * 设置报头
     * @param header
     */
    setHeader(header) {
        Object.assign(this.config.headers, header);
        return this;
    }

    /**
     * 发起一次post请求
     * @param url
     * @param data
     * @param headers
     * @param dataType
     * @returns {Promise<Response>}
     */
    post(url, data, headers = this.config.headers, dataType = this.config.dataType) {
        return this.fetch(this.config.baseUrl + url, data, 'POST', headers, dataType);
    }

    /**
     * 发起一次get请求
     * @param url
     * @param data
     * @param headers
     * @param dataType
     * @returns {Promise<Response>}
     */
    get(url, data = {}, headers = this.config.headers, dataType = this.config.dataType) {
        return this.fetch(this.config.baseUrl + url, data, 'GET', headers, dataType);
    }

    /**
     * 发起一次put请求
     * @param url
     * @param data
     * @param headers
     * @param dataType
     * @returns {Promise<Response>}
     */
    put(url, data, headers = this.config.headers, dataType = this.config.dataType) {
        return this.fetch(this.config.baseUrl + url, data, 'PUT', headers, dataType);
    }

    /**
     * 发起一次delete请求
     * @param url
     * @param data
     * @param headers
     * @param dataType
     * @returns {Promise<Response>}
     */
    delete(url, data = {}, headers = this.config.headers, dataType = this.config.dataType) {
        return this.fetch(this.config.baseUrl + url, data, 'DELETE', headers, dataType);
    }

    /**
     * 订阅事件 beforeFetch/complete/success/catch/error
     * @param eventKey
     * @param fn
     */
    subscribe(eventKey, fn) {
        if (['beforeFetch', 'complete', 'success', 'catch', 'error'].indexOf(eventKey) >= 0) {
            PubSub.subscribe(this.key + '-' + eventKey, fn);
        }
    }

    /**
     * 取消订阅
     * @param eventKey
     * @param fn
     */
    unsubscribe = (token = null) => {
        if (token) {
            PubSub.unsubscribe(token);
        }
    };

    /**
     * 触发订阅事件
     * @param eventKey
     * @param data
     */
    publishSync(eventKey, data = {}) {
        PubSub.publishSync(this.key + '-' + eventKey, data);
    }

    /**
     * 触发订阅事件
     * @param eventKey
     * @param data
     */
    publish(eventKey, data = {}) {
        PubSub.publish(this.key + '-' + eventKey, data);
    }

    getMode = () => {
        return this.config.cross ? 'cors' : 'no-cors';
    };

    getBody = (data, type) => {
        let body;
        switch (type) {
            case 'json':
                body = JSON.stringify(data);
                break;
            default:
                body = param(data);
        }
        return body;
    };

    fetch = (url, data, method, headers = this.config.headers, dataType = this.config.dataType) => {
        this.publishSync('beforeFetch', data);
        let fetchProps = {
            mode: this.getMode(),
            method: method,
            'Cache-Control': 'no-cache',
            headers: Object.assign({
                'Content-Type': this.contentType[dataType]
            }, headers)
        };
        if ((typeof FormData != 'undefined') && (data instanceof FormData)) {
            fetchProps.body = data;
            delete fetchProps.headers['Content-Type'];
        } else {
            switch (method) {
                case 'GET':
                    url += '?' + param(data);
                    break;
                case 'POST':
                case 'PUT':
                    fetchProps.body = this.getBody(data, dataType);
                    break;
            }
        }
        let promise = fetch(url, fetchProps);
        promise.then((res) => {
            this.publish('complete', res);
            if (res.ok) {
                try {
                    if (this.config.responseType == 'json') {
                        res.clone().json().then((json) => {
                            this.publish('success', json);
                        });
                    } else {
                        res.clone().text().then((data) => {
                            this.publish('success', data);
                        });
                    }
                } catch (error) {
                    this.publish('catch', {
                        error: error,
                        res: res.clone()
                    });
                }
            } else {
                this.publish('error', res.clone());
            }
        }).catch((error) => {
            this.publish('catch', {
                error: error
            });
        });
        return promise;
    };

}