<?php

declare(strict_types=1);

namespace ApiHorseRacing;

/**
 * Any non-2xx response, or a transport failure.
 *
 * $code is stable and worth branching on. getMessage() is written for a person
 * and may be reworded.
 */
final class ApiException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 0,
        public readonly string $code = '',
        public readonly string $requestId = '',
        public readonly string $docUrl = ''
    ) {
        parent::__construct($message, $status);
    }
}
