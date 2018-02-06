// 引入依赖
var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
// url模块是nodejs标准库里面的
// http://nodejs.org/api/url.hml
var url = require('url');

var cnodeUrl = 'https://cnodejs.org/';

superagent.get(cnodeUrl).end(function(err,res){
	if(err){
		return console.error(err);
	}
	var topicUrls = [];
	var $ = cheerio.load(res.text);
	// 获取首页所有的链接
	$('#topic_list .topic_title').each(function(idx,element){
		var $element = $(element);
		// $element.attr('href')本来的样子是/topic/542acd7d5d28233425538b04
		// 这里用url.resolve来自动推断出完整url，变成https://cnodejs.org/topic/542acd7d5d28233425538b04 的形式
		// 具体请看 http://nodejs.org/api/url.html#url_url_resolve_from_to 的示例
		var href = url.resolve(cnodeUrl,$element.attr('href'));
		topicUrls.push(href);
	});
	// 实例eventproxy
	var ep = new eventproxy();
	// 命令ep重复监听topicUrls.length次 topic_html事件再处理
	ep.after('topic_html',topicUrls.length,function(topics){
		// topics 是个数组
		// 处理数据
		topics = topics.map(function(topicPair){
			// 类似jquery
			var topicUrl = topicPair[0];
			var topicHtml = topicPair[1];
			var $ = cheerio.load(topicHtml);
			// 获取评论的作者和积分
			var commentInfo = topicPair[2];
			var author1 = '';
			var score1 = '';
			if(commentInfo.length>0){
				author1 = commentInfo[0];
				score1 = commentInfo[1];
			}

			return ({
				title:$('.topic_full_title').text().trim(),
				href:topicUrl,
				comment1:$('.reply_content').eq(0).text().trim(),
				author1:author1,
				score1:score1,
			});
		});
		console.log('final:');
		console.log(topics);
	});
	topicUrls.forEach(function(topicUrl){
		superagent.get(topicUrl).end(function(err,res){
			var topicInfo = res.text;
			var $ = cheerio.load(topicInfo);
			var	commentInfo = [];
			if($('.user_avatar').attr('href')){
				var userUrl = url.resolve(cnodeUrl,$('.user_avatar').attr('href'));
				superagent.get(userUrl).end(function(err,res){
					var $ = cheerio.load(res.text);
					author1 = $('#content .panel .userinfo .user_big_avatar .user_avatar').attr('title');
					score1 = $('#content .panel .userinfo .user_profile .unstyled > span').text();
					commentInfo = [author1,score1];
					ep.emit('topic_html',[topicUrl,topicInfo,commentInfo]);
				});
			}else{
				ep.emit('topic_html',[topicUrl,topicInfo,commentInfo]);
			}
		});
	});
});