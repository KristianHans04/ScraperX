import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Calendar, Clock, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl?: string;
  tags: string[];
  publishedAt: string;
  author: {
    name: string;
  };
}

export function BlogListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(searchParams.get('tag'));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPosts();
  }, [selectedTag, page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '12',
        ...(selectedTag && { tag: selectedTag }),
      });

      const response = await fetch(`/api/public/blog/posts?${params}`);
      const data = await response.json();

      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
      setSearchParams({});
    } else {
      setSelectedTag(tag);
      setSearchParams({ tag });
    }
    setPage(1);
  };

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateReadTime = (excerpt: string) => {
    const words = excerpt.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  return (
    <PublicLayout>
      <section className="py-24 bg-black relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none opacity-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
              Blog
            </h1>
            <p className="text-xl text-silver-400 max-w-2xl mx-auto">
              Insights, tutorials, and updates from the Scrapifie team.
            </p>
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                    selectedTag === tag
                      ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                      : 'bg-white/5 border border-white/10 text-silver-400 hover:text-white hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <p className="text-silver-400 text-lg">
                No blog posts found{selectedTag && ` for tag "${selectedTag}"`}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm hover:-translate-y-1 hover:shadow-2xl"
                  >
                    {post.featuredImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out grayscale group-hover:grayscale-0"
                        />
                      </div>
                    )}
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-4 text-xs font-medium text-silver-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(post.publishedAt)}</span>
                        </div>
                        <span className="text-white/20">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{calculateReadTime(post.excerpt)}</span>
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-4 group-hover:text-silver-200 transition-colors leading-tight">
                        {post.title}
                      </h2>
                      <p className="text-silver-400 mb-6 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-medium bg-white/5 border border-white/10 text-silver-300 px-3 py-1 rounded-full group-hover:bg-white/10 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-4 mt-20">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="px-6 py-3 text-silver-400 flex items-center">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
