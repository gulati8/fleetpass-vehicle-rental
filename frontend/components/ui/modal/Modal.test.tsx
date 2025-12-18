import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from './Modal';

describe('Modal', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a container for portal
    container = document.createElement('div');
    container.id = 'modal-root';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    document.body.removeChild(container);
    document.body.style.overflow = 'unset';
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );

    const backdrop = document.querySelector('.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      await user.click(backdrop as Element);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('prevents body scroll when open', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  describe('Focus Trap', () => {
    it('focuses first focusable element when opened', async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <button data-testid="first-button">First</button>
          <button data-testid="second-button">Second</button>
        </Modal>
      );

      await waitFor(() => {
        const firstButton = screen.getByTestId('first-button');
        expect(firstButton).toHaveFocus();
      });
    });

    it('traps focus within modal when tabbing forward', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <button data-testid="first-button">First</button>
          <button data-testid="last-button">Last</button>
        </Modal>
      );

      const firstButton = screen.getByTestId('first-button');
      const lastButton = screen.getByTestId('last-button');

      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });

      // Tab to last button
      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab should cycle back to first button
      await user.tab();
      expect(firstButton).toHaveFocus();
    });

    it('traps focus within modal when tabbing backward', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <button data-testid="first-button">First</button>
          <button data-testid="last-button">Last</button>
        </Modal>
      );

      const firstButton = screen.getByTestId('first-button');
      const lastButton = screen.getByTestId('last-button');

      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });

      // Shift+Tab should cycle to last button
      await user.tab({ shift: true });
      expect(lastButton).toHaveFocus();
    });
  });

  describe('Sizes', () => {
    it('renders with default size (md)', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('renders with sm size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-md');
      expect(modal).toBeInTheDocument();
    });

    it('renders with lg size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('renders with xl size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('renders with full size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="full">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-full');
      expect(modal).toBeInTheDocument();
    });
  });
});

describe('ModalHeader', () => {
  it('renders with children', () => {
    render(<ModalHeader>Header content</ModalHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies default styling', () => {
    render(<ModalHeader data-testid="header">Content</ModalHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('p-6');
    expect(header).toHaveClass('pb-4');
  });

  it('merges custom className', () => {
    render(
      <ModalHeader className="custom-class" data-testid="header">
        Content
      </ModalHeader>
    );
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-class');
    expect(header).toHaveClass('flex');
  });
});

describe('ModalTitle', () => {
  it('renders as h2 element', () => {
    render(<ModalTitle>Title</ModalTitle>);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('applies default styling', () => {
    render(<ModalTitle data-testid="title">Title</ModalTitle>);
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-xl');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('text-neutral-900');
  });

  it('merges custom className', () => {
    render(
      <ModalTitle className="text-2xl" data-testid="title">
        Title
      </ModalTitle>
    );
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-2xl');
    expect(title).toHaveClass('font-semibold');
  });
});

describe('ModalDescription', () => {
  it('renders as p element', () => {
    render(<ModalDescription>Description</ModalDescription>);
    const description = screen.getByText('Description');
    expect(description.tagName).toBe('P');
  });

  it('applies default styling', () => {
    render(<ModalDescription data-testid="desc">Description</ModalDescription>);
    const description = screen.getByTestId('desc');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-neutral-600');
    expect(description).toHaveClass('mt-1');
  });

  it('merges custom className', () => {
    render(
      <ModalDescription className="text-base" data-testid="desc">
        Description
      </ModalDescription>
    );
    const description = screen.getByTestId('desc');
    expect(description).toHaveClass('text-base');
    expect(description).toHaveClass('text-neutral-600');
  });
});

describe('ModalBody', () => {
  it('renders with children', () => {
    render(<ModalBody>Body content</ModalBody>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('applies default styling', () => {
    render(<ModalBody data-testid="body">Content</ModalBody>);
    const body = screen.getByTestId('body');
    expect(body).toHaveClass('px-6');
    expect(body).toHaveClass('py-4');
  });

  it('merges custom className', () => {
    render(
      <ModalBody className="custom-class" data-testid="body">
        Content
      </ModalBody>
    );
    const body = screen.getByTestId('body');
    expect(body).toHaveClass('custom-class');
    expect(body).toHaveClass('px-6');
  });
});

describe('ModalFooter', () => {
  it('renders with children', () => {
    render(<ModalFooter>Footer content</ModalFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies default styling', () => {
    render(<ModalFooter data-testid="footer">Content</ModalFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('justify-end');
    expect(footer).toHaveClass('gap-3');
    expect(footer).toHaveClass('p-6');
    expect(footer).toHaveClass('pt-4');
    expect(footer).toHaveClass('bg-neutral-50');
  });

  it('merges custom className', () => {
    render(
      <ModalFooter className="justify-start" data-testid="footer">
        Content
      </ModalFooter>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('justify-start');
    expect(footer).toHaveClass('flex');
  });
});

describe('ModalCloseButton', () => {
  it('renders close button with icon', () => {
    render(<ModalCloseButton onClose={vi.fn()} />);
    const button = screen.getByRole('button', { name: /close modal/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClose when clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<ModalCloseButton onClose={handleClose} />);

    const button = screen.getByRole('button', { name: /close modal/i });
    await user.click(button);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('has aria-label for accessibility', () => {
    render(<ModalCloseButton onClose={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Close modal');
  });
});

describe('Modal Compound Component Integration', () => {
  it('renders complete modal with all compound components', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <ModalHeader>
          <div>
            <ModalTitle>Modal Title</ModalTitle>
            <ModalDescription>Modal description</ModalDescription>
          </div>
          <ModalCloseButton onClose={vi.fn()} />
        </ModalHeader>
        <ModalBody>Body content</ModalBody>
        <ModalFooter>Footer actions</ModalFooter>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Modal Title' })
    ).toBeInTheDocument();
    expect(screen.getByText('Modal description')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });
});
