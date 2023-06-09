/*********************************************************************************************************************
*
*
*                              H5开发环境模拟真实环境Api，及用户登录（此文件请勿修改,不会被打包进最终产物）
*
*
**********************************************************************************************************************/


// 底座webView自定义的userAgent
const CWY_RN_UA = 'cwy-app-webview'

/* 获取环境变量判断网页所处环境 */
const isCWYApp = () => {
  const ua = navigator.userAgent.toLowerCase()
  if (ua === CWY_RN_UA) {
    // app内嵌webview
    return true
  }
  // 未知环境按h5处理
  return false
}

/* 判断对象是否有某个key */
const objHas = (obj, key) => {
  return Object.hasOwnProperty.call(obj, key)
}
/* 只有不是ReactNative的环境，下方模拟的api才会生效 */
if (!isCWYApp()) {
  /*********************************************************************************************************************
  *
  *
  *                                         迁移Taro H5端 Api （具体调用可参照taro官方文档）
  *
  *
  **********************************************************************************************************************/

  /* ***************************************** 迁移Taro H5环境 Taro.request （jsonp调用方式未迁移） ***************************************** */
  /* 拼接对象为字符串 */
  const serializeParams = (params) => {
    if (!params) {
      return ''
    }
    return Object.keys(params)
      .map(key => (
        `${encodeURIComponent(key)}=${typeof (params[key]) === 'object'
          ? encodeURIComponent(JSON.stringify(params[key]))
          : encodeURIComponent(params[key])}`))
      .join('&')
  }
  /* 拼接请求url */
  const generateRequestUrlWithParams = (url, params) => {
    params = typeof params === 'string' ? params : serializeParams(params)
    if (params) {
      url += (~url.indexOf('?') ? '&' : '?') + params
    }
    url = url.replace('?&', '?')
    return url
  }
  /* 网络请求方法 */
  const request = (options) => {
    options = options || {}
    if (typeof options === 'string') {
      options = {
        url: options
      }
    }
    const { success, complete, fail } = options
    let url = options.url
    const params = {}
    const res = {}
    params.method = options.method || 'GET'
    const methodUpper = params.method.toUpperCase()
    params.cache = options.cache || 'default'
    if (methodUpper === 'GET' || methodUpper === 'HEAD') {
      url = generateRequestUrlWithParams(url, options.data)
    } else if (typeof options.data === 'object') {
      let contentType = options.header && (options.header['Content-Type'] || options.header['content-type'])
      if (contentType && contentType.indexOf('application/json') >= 0) {
        params.body = JSON.stringify(options.data)
      } else if (contentType && contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
        params.body = serializeParams(options.data)
      } else {
        params.body = options.data
      }
    } else {
      params.body = options.data
    }
    if (options.header) {
      params.headers = options.header
    }
    if (options.mode) {
      params.mode = options.mode
    }
    if (options.signal) {
      params.signal = options.signal
    }
    params.credentials = options.credentials
    return fetch(url, params)
      .then(response => {
        res.statusCode = response.status
        res.header = {}
        response.headers.forEach((val, key) => {
          res.header[key] = val
        })
        if (!response.ok) {
          throw response
        }
        if (options.responseType === 'arraybuffer') {
          return response.arrayBuffer()
        }
        if (res.statusCode !== 204) {
          if (options.dataType === 'json' || typeof options.dataType === 'undefined') {
            return response.json()
          }
        }
        if (options.responseType === 'text') {
          return response.text()
        }
        return Promise.resolve(null)
      })
      .then(data => {
        res.data = data
        typeof success === 'function' && success(res)
        typeof complete === 'function' && complete(res)
        return res
      })
      .catch(err => {
        typeof fail === 'function' && fail(err)
        typeof complete === 'function' && complete(res)
        return Promise.reject(err)
      })
  }
  /* ***************************************** 迁移Taro H5环境 Taro.downloadFile ***************************************** */
  const createCallbackManager = () => {
    const callbacks = []

    /**
     * 添加回调
     * @param {{ callback: function, ctx: any } | function} opt
     */
    const add = (opt) => {
      callbacks.push(opt)
    }

    /**
     * 移除回调
     * @param {{ callback: function, ctx: any } | function} opt
     */
    const remove = (opt) => {
      let pos = -1
      callbacks.forEach((callback, k) => {
        if (callback === opt) {
          pos = k
        }
      })
      if (pos > -1) {
        callbacks.splice(pos, 1)
      }
    }

    /**
     * 获取回调函数数量
     * @return {number}
     */
    const count = () => callbacks.length

    /**
     * 触发回调
     * @param  {...any} args 回调的调用参数
     */
    const trigger = (...args) => {
      callbacks.forEach(opt => {
        if (typeof opt === 'function') {
          opt(...args)
        } else {
          const { callback, ctx } = opt
          callback.call(ctx, ...args)
        }
      })
    }

    return {
      add,
      remove,
      count,
      trigger
    }
  }
  const NETWORK_TIMEOUT = 60000
  const XHR_STATS = {
    UNSENT: 0, // Client has been created. open() not called yet.
    OPENED: 1, // open() has been called.
    HEADERS_RECEIVED: 2, // send() has been called, and headers and status are available.
    LOADING: 3, // Downloading; responseText holds partial data.
    DONE: 4 // The operation is complete.
  }
  /**
   * 设置xhr的header
   * @param {XMLHttpRequest} xhr
   * @param {Object} header
   */
  const setHeader = (xhr, header) => {
    let headerKey
    for (headerKey in header) {
      xhr.setRequestHeader(headerKey, header[headerKey])
    }
  }
  const createDownloadTask = ({ url, header, success, error }) => {
    let timeout
    const apiName = 'downloadFile'
    const xhr = new XMLHttpRequest()
    const callbackManager = {
      headersReceived: createCallbackManager(),
      progressUpdate: createCallbackManager()
    }

    xhr.withCredentials = true
    xhr.open('GET', url, true)
    xhr.responseType = 'blob'
    setHeader(xhr, header)

    xhr.onprogress = e => {
      const { loaded, total } = e
      callbackManager.progressUpdate.trigger({
        progress: Math.round(loaded / total * 100),
        totalBytesWritten: loaded,
        totalBytesExpectedToWrite: total
      })
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XHR_STATS.HEADERS_RECEIVED) return
      callbackManager.headersReceived.trigger({
        header: xhr.getAllResponseHeaders()
      })
    }

    xhr.onload = () => {
      const response = xhr.response
      const status = xhr.status
      success({
        errMsg: `${apiName}:ok`,
        statusCode: status,
        tempFilePath: window.URL.createObjectURL(response)
      })
    }

    xhr.onabort = () => {
      clearTimeout(timeout)
      error({
        errMsg: `${apiName}:fail abort`
      })
    }

    xhr.onerror = e => {
      error({
        errMsg: `${apiName}:fail ${e.message}`
      })
    }

    const send = () => {
      xhr.send()
      timeout = setTimeout(() => {
        xhr.onabort = null
        xhr.onload = null
        xhr.onprogress = null
        xhr.onreadystatechange = null
        xhr.onerror = null
        abort()
        error({
          errMsg: `${apiName}:fail timeout`
        })
      }, NETWORK_TIMEOUT)
    }

    send()

    /**
     * 中断任务
     */
    const abort = () => {
      xhr.abort()
    }

    /**
     * 监听 HTTP Response Header 事件。会比请求完成事件更早
     * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
     */
    const onHeadersReceived = callbackManager.headersReceived.add
    /**
     * 取消监听 HTTP Response Header 事件
     * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
     */
    const offHeadersReceived = callbackManager.headersReceived.remove

    /**
     * 监听进度变化事件
     * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
     */
    const onProgressUpdate = callbackManager.progressUpdate.add
    /**
     * 取消监听进度变化事件
     * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
     */
    const offProgressUpdate = callbackManager.progressUpdate.remove

    return {
      abort,
      onHeadersReceived,
      offHeadersReceived,
      onProgressUpdate,
      offProgressUpdate
    }
  }
  /**
   * 下载文件资源到本地。客户端直接发起一个 HTTPS GET 请求，返回文件的本地临时路径。使用前请注意阅读相关说明。
   * 注意：请在服务端响应的 header 中指定合理的 Content-Type 字段，以保证客户端正确处理文件类型。
   * @todo 未挂载 task.offHeadersReceived
   * @todo 未挂载 task.offProgressUpdate
   * @param {Object} object 参数
   * @param {string} object.url 下载资源的 url
   * @param {Object} [object.header] HTTP 请求的 Header，Header 中不能设置 Referer
   * @param {string} [object.filePath] *指定文件下载后存储的路径
   * @param {function} [object.success] 接口调用成功的回调函数
   * @param {function} [object.fail] 接口调用失败的回调函数
   * @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
   * @returns {DownloadTask}
   */
  const downloadFile = ({ url, header, success, fail, complete }) => {
    let task
    const promise = new Promise((resolve, reject) => {
      task = createDownloadTask({
        url,
        header,
        success: res => {
          success && success(res)
          complete && complete(res)
          resolve(res)
        },
        error: res => {
          fail && fail(res)
          complete && complete(res)
          reject(res)
        }
      })
    })

    promise.headersReceive = task.onHeadersReceived
    promise.progress = task.onProgressUpdate
    promise.abort = task.abort

    return promise
  }
  /* ***************************************** 迁移Taro H5环境 Taro.uploadFile ***************************************** */
  /**
 * 将 blob url 转化为文件
 * @param {string} url 要转换的 blob url
 * @returns {Promise<Blob>}
 */
  const convertObjectUrlToBlob = url => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'blob'
      // eslint-disable-next-line no-unused-vars
      xhr.onload = function (e) {
        if (this.status === 200) {
          resolve(this.response)
        } else {
          /* eslint-disable prefer-promise-reject-errors */
          reject({ status: this.status })
        }
      }
      xhr.send()
    })
  }
  const createUploadTask = ({ url, filePath, fileName, formData, name, header, success, error, withCredentials }) => {
    let timeout
    let formKey
    const apiName = 'uploadFile'
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    const callbackManager = {
      headersReceived: createCallbackManager(),
      progressUpdate: createCallbackManager()
    }

    xhr.withCredentials = withCredentials

    xhr.open('POST', url)
    setHeader(xhr, header)

    for (formKey in formData) {
      form.append(formKey, formData[formKey])
    }

    xhr.upload.onprogress = e => {
      const { loaded, total } = e
      callbackManager.progressUpdate.trigger({
        progress: Math.round(loaded / total * 100),
        totalBytesSent: loaded,
        totalBytesExpectedToSent: total
      })
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XHR_STATS.HEADERS_RECEIVED) return
      callbackManager.headersReceived.trigger({
        header: xhr.getAllResponseHeaders()
      })
    }

    xhr.onload = () => {
      const status = xhr.status
      clearTimeout(timeout)
      success({
        errMsg: `${apiName}:ok`,
        statusCode: status,
        data: xhr.responseText || xhr.response
      })
    }

    xhr.onabort = () => {
      clearTimeout(timeout)
      error({
        errMsg: `${apiName}:fail abort`
      })
    }

    xhr.onerror = e => {
      clearTimeout(timeout)
      error({
        errMsg: `${apiName}:fail ${e.message}`
      })
    }

    const send = () => {
      xhr.send(form)
      timeout = setTimeout(() => {
        xhr.onabort = null
        xhr.onload = null
        xhr.upload.onprogress = null
        xhr.onreadystatechange = null
        xhr.onerror = null
        abort()
        error({
          errMsg: `${apiName}:fail timeout`
        })
      }, NETWORK_TIMEOUT)
    }

    convertObjectUrlToBlob(filePath)
      .then(blob => {
        const tmpFilename = fileName || blob.name || `file-${Date.now()}`
        // 之前这里文件类型是blob，可能丢失信息 这里转换成 File 对象
        const file = new File([blob], tmpFilename, {
          type: blob.type
        })
        form.append(name, file, tmpFilename)
        send()
      })
      .catch(e => {
        error({
          errMsg: `${apiName}:fail ${e.message}`
        })
      })

    /**
     * 中断任务
     */
    const abort = () => {
      clearTimeout(timeout)
      xhr.abort()
    }

    /**
     * 监听 HTTP Response Header 事件。会比请求完成事件更早
     * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
     */
    const onHeadersReceived = callbackManager.headersReceived.add
    /**
     * 取消监听 HTTP Response Header 事件
     * @param {HeadersReceivedCallback} callback HTTP Response Header 事件的回调函数
     */
    const offHeadersReceived = callbackManager.headersReceived.remove

    /**
     * 监听进度变化事件
     * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
     */
    const onProgressUpdate = callbackManager.progressUpdate.add
    /**
     * 取消监听进度变化事件
     * @param {ProgressUpdateCallback} callback HTTP Response Header 事件的回调函数
     */
    const offProgressUpdate = callbackManager.progressUpdate.remove

    return {
      abort,
      onHeadersReceived,
      offHeadersReceived,
      onProgressUpdate,
      offProgressUpdate
    }
  }

  /**
   * 将本地资源上传到服务器。客户端发起一个 HTTPS POST 请求，其中 content-type 为 multipart/form-data。使用前请注意阅读相关说明。
   * @param {Object} object 参数
   * @param {string} object.url 开发者服务器地址
   * @param {string} object.filePath 要上传文件资源的路径
   * @param {string} object.name 文件对应的 key，开发者在服务端可以通过这个 key 获取文件的二进制内容
   * @param {string} [object.fileName] （仅H5）上传的文件名
   * @param {Object} [object.header] HTTP 请求 Header，Header 中不能设置 Referer
   * @param {Object} [object.formData] HTTP 请求中其他额外的 form data
   * @param {function} [object.success] 接口调用成功的回调函数
   * @param {function} [object.fail] 接口调用失败的回调函数
   * @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
   * @param {Boolean} [object.withCredentials] （仅H5）表示跨域请求时是否需要使用凭证
   * @returns {UploadTask}
   */
  const uploadFile = ({ url, filePath, fileName, name, header, formData, success, fail, complete, withCredentials = true }) => {
    let task
    const promise = new Promise((resolve, reject) => {
      task = createUploadTask({
        url,
        header,
        name,
        filePath,
        formData,
        fileName,
        success: res => {
          success && success(res)
          complete && complete(res)
          resolve(res)
        },
        error: res => {
          fail && fail(res)
          complete && complete(res)
          reject(res)
        },
        withCredentials
      })
    })

    promise.headersReceive = task.onHeadersReceived
    promise.progress = task.onProgressUpdate
    promise.abort = task.abort

    return promise
  }

  /* ***************************************** 迁移Taro H5环境 Taro.chooseImage ***************************************** */
  const upperCaseFirstLetter = (string) => {
    if (typeof string !== 'string') return string
    string = string.replace(/^./, match => match.toUpperCase())
    return string
  }
  const getParameterError = ({ name = '', para, correct, wrong }) => {
    const parameter = para ? `parameter.${para}` : 'parameter'
    const errorType = upperCaseFirstLetter(wrong === null ? 'Null' : typeof wrong)
    return `${name}:fail parameter error: ${parameter} should be ${correct} instead of ${errorType}`
  }
  const shouleBeObject = (target) => {
    if (target && typeof target === 'object') return { res: true }
    return {
      res: false,
      msg: getParameterError({
        correct: 'Object',
        wrong: target
      })
    }
  }
  /**
 * 从本地相册选择图片或使用相机拍照。
 * @param {Object} object 参数
 * @param {string[]} [object.sourceType=['album', 'camera']] 选择图片的来源，h5允许传入 `user/environment/camera/`
 * @param {string[]} [object.sizeType=['original', 'compressed']] 所选的图片的尺寸（h5端未实现）
 * @param {number} [object.count=9] 最多可以选择的图片张数
 * @param {function} [object.success] 接口调用成功的回调函数
 * @param {function} [object.fail] 接口调用失败的回调函数
 * @param {function} [object.complete] 接口调用结束的回调函数（调用成功、失败都会执行）
 * @param {string} [object.imageId] 用来上传的input元素ID（仅h5端）
 */
  const chooseImage = function (options) {
    // options must be an Object
    const isObject = shouleBeObject(options)
    if (!isObject.res) {
      const res = { errMsg: `chooseImage${isObject.msg}` }
      console.error(res.errMsg)
      return Promise.reject(res)
    }

    const { count = 1, success, fail, complete, imageId = 'taroChooseImage', sourceType = ['album', 'camera'] } = options
    const res = {
      errMsg: 'chooseImage:ok',
      tempFilePaths: [],
      tempFiles: []
    }
    const sourceTypeString = sourceType && sourceType.toString()
    const acceptableSourceType = ['user', 'environment', 'camera']

    if (count && typeof count !== 'number') {
      res.errMsg = getParameterError({
        name: 'chooseImage',
        para: 'count',
        correct: 'Number',
        wrong: count
      })
      console.error(res.errMsg)
      typeof fail === 'function' && fail(res)
      typeof complete === 'function' && complete(res)
      return Promise.reject(res)
    }

    let taroChooseImageId = document.getElementById(imageId)
    if (!taroChooseImageId) {
      let obj = document.createElement('input')
      obj.setAttribute('type', 'file')
      obj.setAttribute('id', imageId)
      if (count > 1) {
        obj.setAttribute('multiple', 'multiple')
      }
      if (acceptableSourceType.indexOf(sourceTypeString) > -1) {
        obj.setAttribute('capture', sourceTypeString)
      }
      obj.setAttribute('accept', 'image/*')
      obj.setAttribute('style', 'position: fixed; top: -4000px; left: -3000px; z-index: -300;')
      document.body.appendChild(obj)
      taroChooseImageId = document.getElementById(imageId)
    } else {
      if (acceptableSourceType.indexOf(sourceTypeString) > -1) {
        taroChooseImageId.setAttribute('capture', sourceTypeString)
      } else {
        taroChooseImageId.removeAttribute('capture')
      }
    }
    let taroChooseImageCallback
    const taroChooseImagePromise = new Promise(resolve => {
      taroChooseImageCallback = resolve
    })
    let TaroMouseEvents = document.createEvent('MouseEvents')
    TaroMouseEvents.initEvent('click', true, true)
    taroChooseImageId.dispatchEvent(TaroMouseEvents)
    taroChooseImageId.onchange = function (e) {
      let arr = [...e.target.files].splice(0, count)
      arr && arr.forEach(item => {
        let blob = new Blob([item], {
          type: item.type
        })
        let url = URL.createObjectURL(blob)
        res.tempFilePaths.push(url)
        res.tempFiles.push({ path: url, size: item.size, type: item.type, originalFileObj: item })
      })
      typeof success === 'function' && success(res)
      typeof complete === 'function' && complete(res)
      taroChooseImageCallback(res)
      e.target.value = ''
    }
    return taroChooseImagePromise
  }
  /*********************************************************************************************************************
  * 
  * 
  *                                         h5端模拟taro对象，通过H5Api.xxx调用
  *
  *
  **********************************************************************************************************************/
  const H5Api = {
    request,
    downloadFile,
    uploadFile,
    chooseImage
  }
  /* ***************************************** 模拟底座工程对api的二次封装 ***************************************** */
  const H5Request = (params) => {
    // TODO:tokenId、userName、BASE_URL无处理
    const tokenId = 'xxxxxxx'
    const userName = 'xxxxxxx'
    const BASE_URL = ''

    let httpUrl = params.url // 请求地址
    let method = params.method // 请求方式
    let httpParams = params.data
    const contentType = params.contentType || 'application/json'
    let headerParmas = {}
    if (params.url.indexOf('http') === -1) {
      httpUrl = BASE_URL + params.url
    }

    headerParmas = {
      Credentials: 'include',
      Cookie: 'username=' + window.btoa(userName) + '; tokenid=' + tokenId,
      'content-type': contentType,
      tokenid: tokenId
    }
    if (params.contentType === 'application/x-www-form-urlencoded' && params.data) { // 表单
      httpParams = serializeParams(params.data)
    }

    return new Promise((resolve, reject) => {
      H5Api.request({
        url: httpUrl,
        method: method,
        data: httpParams || {},
        responseType: params.responseType || 'text',
        dataType: params.dataType || 'json',
        header: headerParmas,
        timeout: httpUrl === '/amar/billconfig/theme/get/default' ? 6000 : 40000,
        success: res => {
          // TODO:原有移除token、状态码判断等操作未增加
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(res)
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }
  const H5UploadFile = (params) => {
    return new Promise((resolve, reject) => {
      H5Api.uploadFile({
        url: params.url,
        filePath: params.filePath,
        name: params.name,
        header: {
          // TODO:Cookie携带的username，tokenId等未处理，BaseUrl h5未处理
          // Cookie: 'username=' + Base64.encode(userName) + '; tokenid=' + tokenId,
          // tokenid: tokenId// 需要动态修改tokenid值
        },
        formData: {
          name: params.formData.name
        },
        timeout: 40000,
        success(res) {
          if (res.status === 200 || res.statusCode === 200) {
            if (res.data) {
              resolve(res.data)
            } else {
              res.json().then((response) => {
                resolve(response)
              })
            }
          } else {
            reject(res)
          }
        },
        // eslint-disable-next-line no-unused-vars
        fail(res) {
          // TODO:上传fail情况未处理
          reject(res)
        }
      })
    })
  }
  const H5DownloadFile = (params) => {
    return new Promise((resolve, reject) => {
      H5Api.downloadFile({
        url: params.url,
        filePath: params.filePath || '',
        header: {
          // TODO：H5端tokenId怎么处理待解决
          // tokenid: tokenId
        },
        success: res => {
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            reject(res)
          }
        }
      })
    })
  }

  /*********************************************************************************************************************
  * 
  * 
  *                                         H5端api监听postMessage具体实现及分发
  *
  *
  **********************************************************************************************************************/
  class H5DevelopApi {
    constructor(devData) {
      this.devData = devData || {}
      // h5端监听postMessage
      window.addEventListener('message', this.run.bind(this), false)
    }
    // 用于存储api
    apiMap = {
      /* get\post请求 */
      'REQUEST': ({ data, successCall, failCall }) => {
        H5Request(data).then(res => {
          successCall(res)
        }).catch(err => {
          failCall(err)
        })
      },
      /* 上传文件 */
      'UPLOAD_FILE': ({ data, successCall, failCall }) => {
        H5UploadFile(data).then(res => {
          successCall(res)
        }).catch(err => {
          failCall(err)
        })
      },
      /* 文件下载 */
      'DOWNLOAD_FILE': ({ data, successCall, failCall }) => {
        H5DownloadFile(data).then(res => {
          successCall(res)
        }).catch(err => {
          failCall(err)
        })
      },
      /* 获取用户登录信息 */
      'USER_INFO': ({ successCall, failCall }) => {
        if (this.devData.userLoginInfo) {
          successCall(this.devData.userLoginInfo)
        } else {
          failCall(null)
        }
      },
      /* 选择图片 */
      'CHOOSE_IMAGE': ({ data, successCall, failCall }) => {
        H5Api.chooseImage(data).then(res => {
          successCall(res)
        }).catch(err => {
          failCall(err)
        })
      }
    }
    // 发回消息
    sendMsg(data) {
      window.cwyAppSdk.onMessage({ data: JSON.stringify(data) })
    }
    // 组织发送的消息
    buildMsg(flag, params, data) {
      return {
        sdkId: params.sdkId,
        cwyCallId: params.cwyCallId,
        action: params.action,
        data: {
          flag, //回调成功失败状态码
          data
        }
      }
    }
    // 根据报文调用api
    run(e) {
      if (e.data && typeof e.data === 'string' && e.data.indexOf('sdkId') !== -1 && e.data.indexOf('cwyCallId') !== -1) {
        try {
          const jsonData = JSON.parse(e.data) || {}
          const { action } = jsonData
          if (objHas(this.apiMap, action)) {
            // 根据action调用不同api
            this.apiMap[action]({
              data: jsonData.data,
              successCall: (v) => {
                const sendData = this.buildMsg('success', jsonData, v)
                this.sendMsg(sendData)
              },
              failCall: (v) => {
                const sendData = this.buildMsg('fail', jsonData, v)
                this.sendMsg(sendData)
              }
            })
          } else {
            // 调用失败移除回调监听
            window.cwyAppSdk.removeCallFn(jsonData.cwyCallId)
            console.log(`%c 请检查 ${jsonData.action || 'action'} 是否存在，或在真机调试此api `, 'background: #ff4d4f;color: #ffffff;border-radius: 3px;padding: 0;', jsonData)
          }
        } catch (error) {
          console.error('调用参数异常', error)
          console.log('异常数据 => ', e.data)
        }
      }
    }
  }

  // 开发环境用户登录信息
  const userLoginInfo = require('../../public/userLoginInfo.json')
  new H5DevelopApi({ userLoginInfo })
}