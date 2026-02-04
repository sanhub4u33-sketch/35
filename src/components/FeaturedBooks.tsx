import { ArrowRight, Star } from "lucide-react";
import { Button } from "./ui/button";

const books = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    rating: 4.8,
    category: "Fiction",
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop",
    rating: 4.9,
    category: "Self-Help",
  },
  {
    id: 3,
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop",
    rating: 4.7,
    category: "Mystery",
  },
  {
    id: 4,
    title: "The Silent Patient",
    author: "Alex Michaelides",
    cover: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=300&h=400&fit=crop",
    rating: 4.6,
    category: "Thriller",
  },
];

const FeaturedBooks = () => {
  return (
    <section id="catalog" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="font-body text-gold font-medium mb-2">New Arrivals</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
              Featured This Week
            </h2>
          </div>
          <Button variant="ghost" className="group">
            View Full Catalog
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {books.map((book, index) => (
            <div
              key={book.id}
              className="group cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Book Cover */}
              <div className="relative aspect-[3/4] mb-4 rounded-lg overflow-hidden shadow-card card-hover">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                  <Button variant="hero" size="sm" className="w-full">
                    Reserve
                  </Button>
                </div>
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm font-body text-xs text-foreground">
                    {book.category}
                  </span>
                </div>
              </div>

              {/* Book Info */}
              <div>
                <h3 className="font-heading text-lg font-medium text-foreground mb-1 group-hover:text-gold transition-colors line-clamp-1">
                  {book.title}
                </h3>
                <p className="font-body text-muted-foreground text-sm mb-2">
                  {book.author}
                </p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="font-body text-sm text-foreground">{book.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBooks;
