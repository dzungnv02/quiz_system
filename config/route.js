var croot = '/manager';

const route = {
	login: '/login',
	logout: '/logout',
	creator: {
		index: {
			title: 'Quản lý',
			path: croot
		},
		term: {
			index: {
				title: 'Kỳ thi',
				path: croot+'/term'
			},
			create: croot+'/term-create',
			update: croot+'/term-update',
			remove: croot+'/term-delete',
			search: croot+'/term-search',
			load: croot+'/term-load',
			share: croot+'/term-share'
		},
		exam: {
			index: {
				title: 'Bài kiểm tra',
				path: croot+'/exam'
			},
			create: croot+'/exam-create',
			update: croot+'/exam-update',
			remove: croot+'/exam-delete',
			search: croot+'/exam-search',
			load: croot+'/exam-load',
			share: croot+'/exam-share',
			analytics: croot+'/exam-analytics',
			list: croot+'/exam-list'
		},
		question: {
			create: croot+'/question-create',
			update: croot+'/question-update',
			remove: croot+'/question-remove',
			delete: croot+'/question-delete',
			search: croot+'/question-search',
			load: croot+'/question-load'
		},
		answer: {
			create: croot+'/answer-create',
			update: croot+'/answer-update',
			remove: croot+'/answer-delete',
		},
		group: {
			index: {
				title: 'Nhóm',
				path: croot+'/group'
			},
			create: croot+'/group-create',
			remove: croot+'/group-delete',
			join: croot+'/group-join',
			request: croot+'/group-requests',
			user: croot+'/group-users',
			list: croot+'/group-list',
		},
		tag: {
			list: croot+'/tags-list'
		},
		library: {
			list: croot+'/library'
		}
	},
	people: {
		index: {
			title: 'Quản lý',
			path: '/'
		},
	},
	admin: {
		
	}
}


module.exports = route