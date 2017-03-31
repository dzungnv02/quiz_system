const modules = require('../config/module.js');
const ejs = modules.ejs;
const fs = modules.fs;
const crypto = modules.crypto;
const base64url = modules.base64url;

function random(low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
};

function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
  return a
};

function shuffle2(a,b) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
    [b[i - 1], b[j]] = [b[j], b[i - 1]];
  }
};

function flatten_array(a) {
	return [].concat.apply([], a)
};

function if_not_return_null(value) {
	if (value) return value
	return null
};

var objectId = function(id) {
	return new modules.mongo.ObjectID(id);
};

Functions = {
	find_by_id: function(collection, id, callback) {
		if (Array.isArray(id)) {
			collection.find({_id: {$in: id}}).toArray(callback)
		} else {
			collection.findOne({_id: objectId(id)}, callback)
		}
	},
	find_by_creator: function(collection, id, callback) {
		collection.find({creator: objectId(id)}).toArray(callback)
	},
	find_by_query: function(collection, query, callback) {
		collection.find(query, callback)
	},
	insert_one: function(collection, data, callback) {
		collection.insertOne(data, callback)
	},
	remove_by_id: function(collection, id, callback) {
		collection.remove({_id: objectId(id)}, callback)
	},
	update_by_id: function(collection, id, query, callback) {
		collection.update({_id: objectId(id)}, query, callback)
	},
	randomStringAsBase64Url: function(size) {
	  return base64url(crypto.randomBytes(size));
	},
	return_data_with_info: function(data, info) {
		if (Array.isArray(info)) {
			if (data) {
				for (var i = 0; i < data.length; i++) {
					Object.keys(data[i]).forEach(function(key) {
						if (info.indexOf(key) == -1) delete data[i][key]
					})
				}
			} else return []
		}
		return data
	},
	return_array_of_info: function(data, info) {
		let result = [];
		if (data) {
			for (var i = 0; i < data.length; i++) {
				result.push(data[i][info])
			}
		}
		return result
	},
	questions_template: function(questions) {
		let result;
		let template = fs.readFileSync('./views/creator/question-form.ejs', 'utf8');
		if(Array.isArray(questions)) {
			result = [];
			for (let i = 0; i < questions.length; i++) {
				result[i] = ejs.render(template, {
					id: questions[i]._id,
					question: questions[i].question,
					info: questions[i].info,
					answers: questions[i].answers,
					form: questions[i].form,
					draft: questions[i].draft
				})
			}
		} else {
			result = ejs.render(template, {
				id: if_not_return_null(questions._id),
				question: if_not_return_null(questions.question),
				info: if_not_return_null(questions.info),
				answers: if_not_return_null(questions.answers),
				form: if_not_return_null(questions.form),
				draft: if_not_return_null(questions.draft)
			})
		}
		return result
	},
	answers_template: function(form) {
		var data = [];
		if (form == 'true-false') {
			data = [
				{ text: null, is_correct: false, attachment: null}
			]
		}
		if (form == 'one-answer' || form == 'multi-answer') {
			data = [
				{ text: '', is_correct: true, attachment: null},
				{ text: '', is_correct: false,  attachment: null}
			]
		}
		if (form == 'fill-in-form') {
			data = [
				{ text: '', is_correct: true, attachment: null}
			]
		}
		return data
	},
	answer_reformat: function(question, data) {
		if (question.form == 'true-false') {
			if (data.correct != undefined && data.correct == 'true') {
				question.answers[0].is_correct = true;
			} else question.answers[0].is_correct = false;
		}

		if (question.form == 'one-answer') {
			let checker;
			for (let i = 0; i < question.answers.length; i++) {
				if (question.answers[i].is_correct) checker = i;
			}
			if (data.correct != undefined && data.correct && data.answer < question.answers.length) {
				question.answers[data.answer].is_correct = true;
				question.answers[checker].is_correct = false
			}
			if (data.text != undefined) question.answers[data.answer].text = data.text;
		}

		if (question.form == 'multi-answer') {
			for (let i = 0; i < question.answers.length; i++) {
				if (i == data.answer) {
					if (data.correct != undefined) {
						if (data.correct == 'true') question.answers[i].is_correct = true
						else question.answers[i].is_correct = false
					}
					if (data.text != undefined) question.answers[i].text = data.text;
				}
			}
		}

		return question;
	},
	string_to_bool: function(string) {
		if(string){
			if(string == 'true') return true
			else return false
		} else return undefined
	},
	get_element_different: function(arr_old, arr_new) {
		let res = [];
		if (arr_new == []) return arr_old;
		for (let i = 0; i < arr_old.length; i++) {
			let checker = true;
	    for (let j = 0; j < arr_new.length; j++) {
	      if (arr_old[i].equals(arr_new[j])) checker = false
	    }
	    if(checker) res.push(arr_old[i])
		}
		return res
	},
	calculate_test_result: function(answers, cheatsheet) {
		let result = {
			score: 0,
			pass: 0
		};
		let score_avg = 10/cheatsheet.length;
		let checker = true;
		let marker = 0;
		for (let i = 0; i < cheatsheet.length; i++) {
			if(Array.isArray(cheatsheet[i])) {
				let tmp = cheatsheet[i].sort(function(a, b){return a-b});
				for (let j = 0; j < tmp.length; j++) {
					if (tmp[j] != answers[i+j]) checker = false;
					marker = j;
				}
				if(checker) {
					result.pass++;
					result.score += score_avg;
				}
			} else if (cheatsheet[i] == answers[i + marker]) {
				result.pass++;
				result.score += score_avg;
				marker = 0;
			}
		}
		result.score = result.score.toFixed(2)
		return result;
	},
	question_reformat: function(questions, shuffle_exam) {
		let res = {
			questions: [],
			answers: []
		};
		questions.forEach(function(question, i) {
			if (question.question != '') {
				let list_answer = [];
				let line_style = '-inline';
				let input_type = 'radio';
				let tmp_answer;
				if (question.form == 'true-false') {
					list_answer = ['Đúng','Sai'];
					if (question.answers[0].is_correct) {
						if(shuffle_exam) tmp_answer = 'Đúng'
						else tmp_answer = 0
					} else tmp_answer = 1
				}

				if (question.form == 'one-answer') {
					for (let i = 0; i < question.answers.length; i++) { 
						if (question.answers[i].text != '') {
							list_answer.push(question.answers[i].text);
							if (question.answers[i].is_correct) 
								if(shuffle_exam) tmp_answer = question.answers[i].text
								else tmp_answer = i
						}
						if(line_style != '' && question.answers[i].text.length > 30) line_style = '';
					}
				}

				if (question.form == 'multi-answer') {
					input_type = 'checkbox';
					tmp_answer = [];
					for (let i = 0; i < question.answers.length; i++) { 
						if (question.answers[i].text != '') {
							list_answer.push(question.answers[i].text);
							if (question.answers[i].is_correct) 
								if(shuffle_exam) tmp_answer.push(question.answers[i].text)
								else tmp_answer.push(i)
						}
						if(line_style != '' && question.answers[i].text.length > 30) line_style = '';
					}
				}

				if(shuffle_exam) {
					let tmp_list_answer = shuffle(list_answer);
					if (Array.isArray(tmp_answer)) {
						tmp_answer.forEach(function(v, index) {
							for (let i = 0; i < tmp_list_answer.length; i++) {
								if(tmp_list_answer[i] == v) tmp_answer[index] = i;
							}
						})
						tmp_answer.reverse();
					} else {
						for (let i = 0; i < tmp_list_answer.length; i++) {
							if(tmp_list_answer[i] == tmp_answer) tmp_answer = i;
						}
					}
					list_answer = tmp_list_answer;
				}
				res.answers.push(tmp_answer);
				res.questions.push({
					_id: question._id,
					question: question.question,
					info: question.info,
					answers: list_answer,
					type: input_type,
					style: line_style
				})
			}
		});
		if (shuffle_exam) shuffle2(res.questions,res.answers);
		return res;
	},
	api_get_question_reformat: function(questions) {
		let result = [];
		let input_type = 'radio';
		let Q = questions.QUESTION_INFO.item;
		Q.forEach(function(question, i) {
			let q = question.$;
			let list_answer = [];
			for (let i = 1; i < 100; i++) {
				let tmp = 'Answer'+i;
				if (q[tmp] != undefined || q[tmp] != null) list_answer.push(q[tmp])
				else break
			}
			if (q.type == '') input_type = '';
			let data = {
				_id: q.Id,
				question: q.Question,
				answer: q.Result,
				answers:list_answer,
				type: input_type,
			}
			result.push(data);
		});
		return result;
	},
};

module.exports = Functions;