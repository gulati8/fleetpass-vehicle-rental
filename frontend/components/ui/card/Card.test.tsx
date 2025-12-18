import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

describe('Card', () => {
  it('renders with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with default padding (md)', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6'); // md padding
  });

  it('renders with different padding variants', () => {
    const { rerender } = render(<Card padding="none" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-0');

    rerender(<Card padding="sm" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-4');

    rerender(<Card padding="md" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-6');

    rerender(<Card padding="lg" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-8');
  });

  it('applies hover effect when hover prop is true', () => {
    render(<Card hover data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('hover:ring-neutral-900/10');
  });

  it('applies clickable styles when clickable prop is true', () => {
    render(<Card clickable data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:scale-[1.01]');
    expect(card).toHaveClass('active:scale-[0.99]');
  });

  it('merges custom className with variant classes', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('bg-white'); // Still has base class
  });

  it('handles click events when clickable', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Card clickable onClick={handleClick} data-testid="card">
        Content
      </Card>
    );

    await user.click(screen.getByTestId('card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('CardHeader', () => {
  it('renders with children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies default spacing class', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);
    expect(screen.getByTestId('header')).toHaveClass('mb-4');
  });

  it('merges custom className', () => {
    render(<CardHeader className="custom-class" data-testid="header">Content</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-class');
    expect(header).toHaveClass('mb-4');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('applies default styling', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-xl');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('text-neutral-900');
  });

  it('merges custom className', () => {
    render(<CardTitle className="text-2xl" data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-2xl');
    expect(title).toHaveClass('font-semibold'); // Still has default class
  });
});

describe('CardDescription', () => {
  it('renders as p element', () => {
    render(<CardDescription>Description text</CardDescription>);
    const description = screen.getByText('Description text');
    expect(description.tagName).toBe('P');
  });

  it('applies default styling', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    const description = screen.getByTestId('desc');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-neutral-600');
    expect(description).toHaveClass('mt-1');
  });

  it('merges custom className', () => {
    render(<CardDescription className="text-base" data-testid="desc">Description</CardDescription>);
    const description = screen.getByTestId('desc');
    expect(description).toHaveClass('text-base');
    expect(description).toHaveClass('text-neutral-600');
  });
});

describe('CardContent', () => {
  it('renders with children', () => {
    render(<CardContent>Content area</CardContent>);
    expect(screen.getByText('Content area')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<CardContent className="p-4" data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('p-4');
  });
});

describe('CardFooter', () => {
  it('renders with children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies default layout classes', () => {
    render(<CardFooter data-testid="footer">Content</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('mt-6');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('gap-3');
  });

  it('merges custom className', () => {
    render(<CardFooter className="justify-end" data-testid="footer">Content</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('justify-end');
    expect(footer).toHaveClass('flex'); // Still has default class
  });
});

describe('Card Compound Component Integration', () => {
  it('renders complete card with all compound components', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Card Title' })).toBeInTheDocument();
    expect(screen.getByText('Card description text')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });
});
