import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Calendar, Clock, Tag, Share2, Twitter, Linkedin, Link as LinkIcon } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl?: string;
  tags: string[];
  publishedAt: string;
  author: {
    name: string;
  };
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/blog/posts/${slug}`);
      if (!response.ok) {
        throw new Error('Post not found');
      }
      const data = await response.json();
      setPost(data.post);
      setRelatedPosts(data.relatedPosts || []);

      extractHeadings(data.post.content);
    } catch (error) {
      console.error('Failed to fetch blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractHeadings = (content: string) => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const extracted: { id: string; text: string; level: number }[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      extracted.push({ id, text, level });
    }

    setHeadings(extracted);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      post?.title || ''
    )}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      window.location.href
    )}`;
    window.open(url, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Post Not Found
            </h1>
            <Link to="/blog" className="text-blue-600 dark:text-blue-400 hover:underline">
              Back to Blog
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Featured Image */}
              {post.featuredImageUrl && (
                <img
                  src={post.featuredImageUrl}
                  alt={post.title}
                  className="w-full aspect-video object-cover rounded-lg mb-8"
                />
              )}

              {/* Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>•</span>
                  <Clock className="w-4 h-4" />
                  <span>{calculateReadTime(post.content)}</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                  {post.title}
                </h1>
                {post.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-gray-400" />
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/blog?tag=${tag}`}
                        className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}
              </header>

              {/* Share Buttons */}
              <div className="flex items-center gap-2 mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Share:</span>
                <button
                  onClick={shareOnTwitter}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={shareOnLinkedIn}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Share on LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={copyLink}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Copy link"
                >
                  <LinkIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {post.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              {/* Table of Contents */}
              {headings.length > 0 && (
                <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    On This Page
                  </h3>
                  <nav>
                    <ul className="space-y-2">
                      {headings.map((heading) => (
                        <li
                          key={heading.id}
                          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                        >
                          <a
                            href={`#${heading.id}`}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              )}
            </aside>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-16 border-t border-gray-200 dark:border-gray-800">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Related Posts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    to={`/blog/${related.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {related.featuredImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={related.featuredImageUrl}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {related.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {related.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}
