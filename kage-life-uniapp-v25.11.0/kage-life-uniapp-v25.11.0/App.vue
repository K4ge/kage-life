<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	/* 全局字体，让标题、文本都变苹果风 */
	/* iOS 会用 SF Pro，Android 会 fallback 到 Roboto */
	page {
	  font-family: "SF Pro Display", "Helvetica Neue", "Avenir Next", "Avenir",
	    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
	}
	
	/* 覆盖导航栏标题字体样式 */
	.uni-page-head__title,
	.uni-navbar__title {
	  font-family: "SF Pro Display", "Helvetica Neue", "Avenir Next", "Avenir",
		"PingFang SC", "Hiragino Sans GB", sans-serif !important;
	  font-weight: 600 !important;
	  font-size: 17px !important; /* 苹果导航栏标题默认 17px，更优雅 */
	  letter-spacing: 0.5px;      /* 加一点字距，变高级 */
	}
</style>
