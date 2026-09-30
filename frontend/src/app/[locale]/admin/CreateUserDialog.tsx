import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
} from '@heroui/react';
import { roles } from '@/config/selection';
import { isValidEmail, isValidPassword } from '../account/validate';
import { AdminMessages, UserType } from '@/types/user';

type Props = {
  isOpen: boolean;
  isCreating: boolean;
  onCancel: () => void;
  onCreate: (user: Pick<UserType, 'email' | 'username' | 'password' | 'role'>) => Promise<void>;
  messages: AdminMessages;
};

export default function CreateUserDialog({ isOpen, isCreating, onCancel, onCreate, messages }: Props) {
  const defaultRole = roles.findIndex((entry) => entry.uid === 'user');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRole(defaultRole);
    setErrorMessage('');
  }, [defaultRole, isOpen]);

  const validateAndCreate = async () => {
    if (!isValidEmail(email.trim())) {
      setErrorMessage(messages.invalidEmail);
      return;
    }
    if (!username.trim()) {
      setErrorMessage(messages.usernameRequired);
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMessage(messages.invalidPassword);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(messages.passwordNotMatch);
      return;
    }

    try {
      await onCreate({ email: email.trim(), username: username.trim(), password, role });
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.includes('Email already exists')
          ? messages.emailAlreadyExists
          : messages.createUserFailed
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <ModalContent>
        <ModalHeader>{messages.createUser}</ModalHeader>
        <ModalBody>
          {errorMessage && <div className="text-danger text-sm">{errorMessage}</div>}
          <Input isRequired type="email" label={messages.email} value={email} onValueChange={setEmail} />
          <Input isRequired label={messages.username} value={username} onValueChange={setUsername} />
          <Input
            isRequired
            type="password"
            label={messages.initialPassword}
            value={password}
            onValueChange={setPassword}
            autoComplete="new-password"
          />
          <Input
            isRequired
            type="password"
            label={messages.confirmPassword}
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <RadioGroup
            isRequired
            label={messages.role}
            orientation="horizontal"
            value={String(role)}
            onValueChange={(value) => setRole(Number(value))}
          >
            {roles.map((entry, index) => (
              <Radio key={String(index)} value={String(index)}>
                {messages[entry.uid]}
              </Radio>
            ))}
          </RadioGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onCancel}>
            {messages.close}
          </Button>
          <Button color="primary" isLoading={isCreating} onPress={validateAndCreate}>
            {messages.create}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
