/** @format */

// api设计
//  verify.schema({
// 	name: verify.string('必须是字符串').required('需要填写').validate('asd') return message
// 	age: verify.number().min(18, '年龄必须>18')
// }).valiadte({name: 1, age: 15})
//
interface StringSchema {
	min: () => StringSchema
	max: () => StringSchema
	required: (message: any) => StringSchema
	english: (message: any) => StringSchema
	validate: (data: any) => any
}

interface NumberSchema {
	min?: () => NumberSchema
	max?: () => NumberSchema
	validate: (data: any) => any
}

interface Verify {
	string: (message?: string) => StringSchema
	number: (message?: string) => NumberSchema
	schema: any
}

// 每添加一个都要在这里添加一个依赖，以后优化成新增不需要添加依赖
const depsList = ['string', 'number', 'required', 'min', 'max', 'english']

const handler = {
	get: function (target: any, propKey: string, receiver: any) {
		if (propKey === 'validate') {
			return Reflect.get(target, propKey, target).bind(target) // validate 函数开始验证绑定到原始对象
		} else if (depsList.includes(propKey)) {
			return (...args: any) => {
				target.deps.push(target[propKey].bind(target, ...args)) // 访问depsList属性都进行依赖收集
				return receiver // 直接返回代理对象，链式调用
			}
		} else return Reflect.get(target, propKey, target)
	},
}

function validate(value: any) {
	this.message = ''
	this.value = value
	this.deps.forEach((dep: () => any) => dep())
	return this.message
}
class StringVerify {
	value: string
	message: string
	deps: (() => void)[]
	constructor() {
		this.deps = []
	}

	string(message?: string) {
		if (typeof this.value !== 'string') {
			this.message = message ?? ''
		}
	}

	english(message?: string) {
		if (!/^[a-zA-Z]*$/.test(this.value)) {
			this.message = message ?? ''
		}
	}

	required(message?: string) {
		if (!this.value) {
			this.message = message ?? ''
		}
	}

	min(limit: number, message: string) {
		if (this.value.length <= limit) {
			this.message = message
		}
	}

	max(limit: number, message: string) {
		if (this.value.length >= limit) {
			this.message = message
		}
	}

	validate = validate
}

class NumberVerify {
	value: any
	message: string
	deps: (() => void)[]
	constructor() {
		this.deps = []
	}

	number(message: string) {
		if (typeof this.value !== 'number' || isNaN(this.value)) {
			this.message = message
		}
	}

	min(limit: number, message: string) {
		if (this.value <= limit) {
			this.message = message
		}
	}

	max(limit: number, message: string) {
		if (this.value >= limit) {
			this.message = message
		}
	}

	validate = validate
}

class SchemaVerify {
	validators: any
	errors: {}
	constructor(validators: any) {
		this.validators = validators
		this.errors = {}
	}

	validate = (values: any) => {
		Object.keys(this.validators).forEach((key: string) => {
			const validator = this.validators[key]
			const validate = typeof validator === 'function' ? validator : validator.validate
			const value = values?.get ? values.get(key) : values[key]
			this.errors[key] = validate(value)
		})
		return this.errors
	}
}

export const verify: Verify = {
	string: message => new Proxy(new StringVerify(), handler).string(message),
	number: message => new Proxy(new NumberVerify(), handler).number(message),
	schema: (validators: any) => new SchemaVerify(validators),
}

export default verify
