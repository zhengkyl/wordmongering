package common

import (
	"database/sql"
	"time"

	"github.com/zhengkyl/wordmongering/backend/cmd/dash/keymap"
)

const (
	MaxWords = 15
	PageSize = 10
)

var Epoch = time.Date(2026, time.April, 26, 0, 0, 0, 0, time.UTC)

func DayToDate(day int) time.Time {
	return Epoch.AddDate(0, 0, day)
}

type Global struct {
	DB     *sql.DB
	KeyMap keymap.KeyMap
}

type Props struct {
	Width  int
	Height int
	Global Global
}
