import joi from 'joi'
import waterfall from 'waterfally'

let validationMiddlewareFactory = (schema) => {
  return (context) => {

    let toValidate = {}

    Object.keys(schema).forEach((key) => {

      if (typeof context[key] === 'undefined') {
        throw new Error(`Invalid key for validation given, ${ key }`)
      }

      toValidate[key] = context[key]
    })

    return new Promise((resolve, reject) => {

      joi.validate(toValidate, schema, (error, value) => {

        if (error) {
          reject(error)
        } else {

          context = {
            ...context,
            ...value
          }

          resolve(context)
        }
      })
    })
  }
}

let factory = ({models, actions, middlewares}) => {

  let logic = () => {

    let data = {}

    let set = (name, value) => {
      data[name] = value
      return instance
    }

    let setFromObject = (values, keys = null) => {

      if (Array.isArray(keys)) {

        keys.map((key) => {
          data[key] = values[key]
        })

      } else {

        data = {
          ...data,
          ...values
        }

      }

      return instance
    }

    let toUse = []

    let use = (middleware) => {

      if (typeof middleware === 'string') {
        middleware = middlewares[middleware]
      }

      if (typeof middleware === 'undefined') {
        throw new Error(`Cannot use undefined as middleware`)
      }

      toUse.push(middleware)

      return instance
    }

    let run = (action) => {

      if (typeof actions[action] === 'undefined') {
        throw new Error(`Cannot run undefined action ${ action }`)
      }

      action = actions[action]

      let additionalMiddlewares = []
      let context = {
        logic,
        data,
        models,
        middleware: toUse
      }

      if (Array.isArray(action)) {
        if (action.length === 1) {
          action = action[0]
        } else if (action.length === 2) {
          additionalMiddlewares.push(validationMiddlewareFactory(action[0])) // validate schema
          action = action[1]
        } else {
          throw new Error(`Unsupported number of elements in action`)
        }
      }

      return new Promise((resolve, reject) => {

        waterfall([].concat(toUse, additionalMiddlewares), context)
        .then((result) => {
          return action(result)
        })
        .then((result) => {
          resolve(result)
        })
        .catch((error) => {
          reject(error)
        })

      })
    }

    const instance = {
      run,
      use,
      set,
      setFromObject
    }

    return instance
  }

  return logic
}

export default factory
