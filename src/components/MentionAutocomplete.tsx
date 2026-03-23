'use client';

import { useState, useEffect, useRef } from 'react';

interface MentionAutocompleteProps {
  input: string;
  cursorPosition: number;
  users: Array<{ id: string; name: string }>;
  onSelect: (mention: string) => void;
  visible: boolean;
  position: { top: number; left: number };
}

export default function MentionAutocomplete({
  input,
  cursorPosition,
  users,
  onSelect,
  visible,
  position
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the @ symbol and extract filter text
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      setFilter(textBeforeCursor.slice(lastAtIndex + 1).toLowerCase());
    } else {
      setFilter('');
    }
    setSelectedIndex(0);
  }, [input, cursorPosition]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(filter) && filter !== ''
  );

  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || filteredUsers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredUsers[selectedIndex]) {
          e.preventDefault();
          onSelect(filteredUsers[selectedIndex].name);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, filteredUsers, selectedIndex, onSelect]);

  if (!visible || filteredUsers.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="mention-autocomplete"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000
      }}
    >
      <div className="mention-header">💡 Выберите пользователя</div>
      {filteredUsers.slice(0, 5).map((user, index) => (
        <div
          key={user.id}
          className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(user.name)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="mention-avatar">👤</span>
          <span className="mention-name">{user.name}</span>
        </div>
      ))}
    </div>
  );
}
