<?php
declare(strict_types=1);

/**
 * Tiny Markdown -> HTML renderer for data/*.md description pages.
 * Zero-dep subset: headings, bold/italic, links, lists, blockquote,
 * code spans/blocks, paragraphs. Text is escaped first, so output is safe.
 */
final class Markdown
{
    public static function render(string $md): string
    {
        $md = str_replace("\r\n", "\n", $md);
        $md = preg_replace('/```(?:[a-z]*)\n(.*?)```/s', "\x01PRE\x02$1\x01/PRE\x02", $md) ?? $md;
        $lines = explode("\n", $md);
        $out = [];
        $inList = false;
        $paragraph = [];
        $flushP = function (array &$paragraph, array &$out) use (&$inList): void {
            if ($paragraph) {
                $out[] = '<p>' . self::inline(implode(' ', $paragraph)) . '</p>';
                $paragraph = [];
            }
        };
        $closeList = function (array &$out) use (&$inList): void {
            if ($inList) { $out[] = '</ul>'; $inList = false; }
        };
        foreach ($lines as $line) {
            $t = trim($line);
            if ($t === '') {
                $flushP($paragraph, $out); $closeList($out); continue;
            }
            if (preg_match('/^(#{1,3})\s+(.*)$/', $t, $m)) {
                $flushP($paragraph, $out); $closeList($out);
                $lvl = strlen($m[1]) + 1; // h2..h4 (h1 is the page title)
                $out[] = "<h$lvl>" . self::inline($m[2]) . "</h$lvl>";
            } elseif (preg_match('/^[-*]\s+(.*)$/', $t, $m)) {
                $flushP($paragraph, $out);
                if (!$inList) { $out[] = '<ul>'; $inList = true; }
                $out[] = '<li>' . self::inline($m[1]) . '</li>';
            } elseif (str_starts_with($t, '>')) {
                $flushP($paragraph, $out); $closeList($out);
                $out[] = '<blockquote>' . self::inline(substr($t, 1)) . '</blockquote>';
            } else {
                $paragraph[] = $t;
            }
        }
        $flushP($paragraph, $out); $closeList($out);
        $html = implode("\n", $out);
        $html = preg_replace_callback('/\x01PRE\x02(.*?)\x01\/PRE\x02/s', fn($m) =>
            '<pre><code>' . htmlspecialchars($m[1]) . '</code></pre>', $html) ?? $html;
        return $html;
    }

    private static function inline(string $s): string
    {
        $s = htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $s = preg_replace('/`([^`]+)`/', '<code>$1</code>', $s) ?? $s;
        $s = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $s) ?? $s;
        $s = preg_replace('/(^|[\s(])\*([^*\s]+)\*/', '$1<em>$2</em>', $s) ?? $s;
        $s = preg_replace_callback('/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/', fn($m) =>
            '<a href="' . $m[2] . '" rel="noopener" target="_blank">' . $m[1] . '</a>', $s) ?? $s;
        return $s;
    }
}
