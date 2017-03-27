var croot = '/manager';

const route = {
	login: '/login',
	logout: '/logout',
	creator: {
		index: {
			title: 'Quản lý',
			path: croot
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
			share: croot+'/exam-share'
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
				title: 'Group',
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